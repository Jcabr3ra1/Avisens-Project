import { useEffect, useMemo, useRef, useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import { listarDispositivos, type Dispositivo } from '@features/dispositivos/api/dispositivos'
import DispositivosDeGalpon from '@features/dispositivos/components/DispositivosDeGalpon'
import {
  activarSensor, crearSensor, desactivarSensor, eliminarSensor, listarSensores,
  type CrearSensorAutomaticoPayload, type Sensor,
} from '@features/sensores/api/sensores'
import { listarCatalogoSensores, type CatalogoSensor } from '@features/sensores/api/catalogoSensores'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { IcCheck, IcChevronDown, IcPlus, IcTrash } from '@shared/ui/icons/icons'
import './MonitoreoPage.css'
import './AsignarSensores.css'
import ConexionDhtSensor, { OpcionesGpioDht } from './ConexionDhtSensor'
import { esVariableDht } from './conexionDht'
import RelesDelGalpon from '@features/sensores/components/RelesDelGalpon'
import { esSensorRele } from '@features/sensores/model/reles'

type SensorPendiente = {
  clave: number
  tipo: string
  nombre: string
  unidad: string
  dispositivoId: number
  canal: string
}

type OpcionCatalogoSensor = {
  catalogo: CatalogoSensor
  tipo: string
  nombre: string
  unidad: string
}

const UNIDAD_POR_TIPO: Record<string, string> = {
  temperatura: '°C',
  humedad: '%',
  amoniaco: 'ppm',
  co2: 'ppm',
  luminosidad: 'lux',
}

function opcionesDeSensores(catalogo: CatalogoSensor[]): OpcionCatalogoSensor[] {
  return catalogo.flatMap(item => {
    const tipo = item.tipo_sensor.trim().toLowerCase()
    if (tipo === 'nodo_esp32') return []
    if (tipo === 'temperatura_humedad') {
      return [
        { catalogo: item, tipo: 'temperatura', nombre: 'Temperatura', unidad: '°C' },
        { catalogo: item, tipo: 'humedad', nombre: 'Humedad', unidad: '%' },
      ]
    }
    return [{
      catalogo: item,
      tipo: item.tipo_sensor,
      nombre: item.nombre,
      unidad: UNIDAD_POR_TIPO[tipo] ?? 'N/D',
    }]
  })
}

function AsignarSensores({
  galponId,
  galponCodigo,
  galponNombre,
  recargar,
}: {
  galponId: number
  galponCodigo: string
  galponNombre: string
  recargar: () => Promise<void>
}) {
  const [catalogo, setCatalogo] = useState<CatalogoSensor[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [revision, setRevision] = useState(0)
  const [controladoresAbiertos, setControladoresAbiertos] = useState(false)
  const [relesAbiertos, setRelesAbiertos] = useState(false)
  const [pendientes, setPendientes] = useState<SensorPendiente[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [sensorOcupado, setSensorOcupado] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const siguienteClave = useRef(1)
  const puedeRegistrar = getRol() === ROL_ADMIN
  const opciones = useMemo(() => opcionesDeSensores(catalogo), [catalogo])

  useEffect(() => {
    if (!puedeRegistrar) {
      setCargando(false)
      return
    }
    let vigente = true
    setCargando(true)
    setErrorCarga('')
    Promise.all([listarCatalogoSensores(), listarDispositivos(), listarSensores()])
      .then(([elementos, listaDispositivos, listaSensores]) => {
        if (!vigente) return
        setCatalogo(elementos.filter(item => item.activo))
        setDispositivos(listaDispositivos)
        if (!listaDispositivos.some(dispositivo => dispositivo.galpon.id === galponId && dispositivo.activo)) {
          setControladoresAbiertos(true)
        }
        setSensores(listaSensores.filter(sensor => sensor.galpon.id === galponId))
      })
      .catch(problema => {
        if (!vigente) return
        setDispositivos([])
        setErrorCarga(mensajeDeError(problema, 'No se pudieron cargar el catálogo, los controladores y los sensores.'))
      })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [puedeRegistrar, galponId, revision])

  useEffect(() => {
    setPendientes([])
    setMensaje('')
    setError('')
  }, [galponId])

  const disponibles = dispositivos.filter(dispositivo => dispositivo.galpon.id === galponId && dispositivo.activo)
  function actualizarControladores() {
    setRevision(actual => actual + 1)
    void recargar()
  }
  function agregar(opcion: OpcionCatalogoSensor) {
    setPendientes(actuales => [...actuales, {
      clave: siguienteClave.current++,
      tipo: opcion.tipo,
      nombre: opcion.nombre,
      unidad: opcion.unidad,
      dispositivoId: 0,
      canal: '',
    }])
    setMensaje('')
    setError('')
  }

  function editarCanal(clave: number, canal: string) {
    setPendientes(actuales => actuales.map(item => item.clave === clave ? { ...item, canal } : item))
  }

  function editar(clave: number, dispositivoId: number) {
    setPendientes(actuales => actuales.map(item => item.clave === clave
      ? { ...item, dispositivoId }
      : item))
  }

  async function cambiarSensor(sensor: Sensor, accion: 'activar' | 'desactivar' | 'eliminar') {
    if (sensorOcupado !== null) return
    const nombre = `${etiquetaTipo(sensor.tipo)} (${sensor.codigo})`
    if (accion === 'eliminar' && !window.confirm(
      `¿Eliminar el sensor ${nombre}? Dejará de aparecer en Avisens. Si ya registró lecturas, su historial se conserva para los reportes.`,
    )) return
    if (accion === 'desactivar' && !window.confirm(
      `¿Desactivar el sensor ${nombre}? Deja de contar en el monitoreo y sus lecturas guardadas se conservan.`,
    )) return
    setSensorOcupado(sensor.id)
    setMensaje('')
    setError('')
    try {
      if (accion === 'eliminar') {
        const { retirado } = await eliminarSensor(sensor.id)
        setMensaje(retirado
          ? `Se eliminó el sensor ${nombre}. Sus lecturas anteriores se conservan en el historial.`
          : `Se eliminó el sensor ${nombre}.`)
      } else {
        await (accion === 'activar' ? activarSensor(sensor.id) : desactivarSensor(sensor.id))
        setMensaje(`El sensor ${nombre} quedó ${accion === 'activar' ? 'activo' : 'inactivo'}.`)
      }
      actualizarControladores()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo actualizar el sensor.'))
    } finally {
      setSensorOcupado(null)
    }
  }

  async function registrar() {
    if (guardando || cargando || pendientes.length === 0 || pendientes.some(item => !disponibles.some(d => d.id === item.dispositivoId) || (esVariableDht(item.tipo) && !item.canal))) return
    setGuardando(true)
    setError('')
    setMensaje('')
    let creados = 0
    const clavesCreadas: number[] = []
    const codigosCreados: string[] = []
    try {
      for (const item of pendientes) {
        const payload: CrearSensorAutomaticoPayload = {
          galpon_id: galponId,
          dispositivo_id: item.dispositivoId,
          tipo: item.tipo,
          ...(esVariableDht(item.tipo) ? { canal: item.canal, modelo: 'DHT22' } : {}),
        }
        const creado = await crearSensor(payload)
        creados += 1
        clavesCreadas.push(item.clave)
        codigosCreados.push(creado.codigo)
      }
      setPendientes([])
      setMensaje(`Se registraron ${creados} sensor${creados === 1 ? '' : 'es'} en ${galponNombre}. El controlador con firmware compatible consultará las conexiones automáticamente. Seriales: ${codigosCreados.join(', ')}.`)
      await recargar()
    } catch (problema) {
      setPendientes(actuales => actuales.filter(item => !clavesCreadas.includes(item.clave)))
      setError(`${creados > 0 ? `Se registraron ${creados}; ` : ''}${mensajeDeError(problema, 'No se pudo completar el registro.')}`)
      if (codigosCreados.length > 0) {
        setMensaje(`Sensores ya registrados: ${codigosCreados.join(', ')}.`)
      }
      if (creados > 0) await recargar()
    } finally {
      if (creados > 0) setRevision(actual => actual + 1)
      setGuardando(false)
    }
  }

  function etiquetaTipo(tipo: string) {
    return opciones.find(opcion => opcion.tipo === tipo)?.nombre ?? tipo.replace(/_/g, ' ')
  }

  if (!puedeRegistrar) return null

  const reles = sensores.filter(esSensorRele)
  // Listos = cada relé tiene canal: el firmware nuevo puede controlarlos.
  const relesListos = reles.length > 0 && reles.every(sensor => sensor.canal)
  const activos = sensores.filter(sensor => sensor.estado !== 'inactivo')
  const desactivados = sensores.filter(sensor => sensor.estado === 'inactivo')
  const conCanal = activos.filter(sensor => sensor.canal).length
  const pasoListo = [disponibles.length > 0, activos.length > 0, activos.length > 0 && conCanal === activos.length]

  function tablaSensores(lista: Sensor[], etiqueta: string) {
    return (
      <div className="cs-tabla-scroll">
        <table className="cs-tabla" aria-label={etiqueta}>
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Serial</th>
              <th>Controlador</th>
              <th>Conexión</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {lista.map(sensor => (
              <tr key={sensor.id} className={sensor.estado === 'inactivo' ? 'is-inactivo' : undefined} aria-busy={sensorOcupado === sensor.id}>
                <td>
                  <span className="cs-sensor">
                    <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(sensor.tipo, 18)}</span>
                    <span className="cs-opcion-texto">
                      <strong>{etiquetaTipo(sensor.tipo)}</strong>
                      <small>
                        {sensor.unidad_medida} · <span className={`cs-sensor-estado cs-sensor-estado--${sensor.estado}`}>{sensor.estado === 'activo' ? 'Activo' : sensor.estado === 'inactivo' ? 'Inactivo' : sensor.estado}</span>
                      </small>
                    </span>
                  </span>
                </td>
                <td><code className="cs-codigo">{sensor.codigo}</code></td>
                <td><code className="cs-codigo">{sensor.dispositivo.codigo_topic}</code></td>
                <td>
                  {sensor.estado === 'inactivo' ? (
                    <span className="cs-nota cs-nota--celda">{sensor.canal ?? 'Sin conexión'}</span>
                  ) : esVariableDht(sensor.tipo) ? (
                    <ConexionDhtSensor key={`${sensor.id}-${sensor.canal}`} sensor={sensor} alGuardar={() => {
                      setMensaje(`Conexión de ${sensor.codigo} guardada. El controlador la consultará automáticamente.`)
                      actualizarControladores()
                    }} />
                  ) : <span className="cs-nota cs-nota--celda">{sensor.canal ?? 'Lector por serial'}</span>}
                </td>
                <td className="cs-celda-acciones">
                  <span className="cs-acciones">
                    <button
                      type="button"
                      className="cs-accion"
                      disabled={sensorOcupado !== null}
                      onClick={() => void cambiarSensor(sensor, sensor.estado === 'inactivo' ? 'activar' : 'desactivar')}
                    >
                      {sensor.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
                    </button>
                    <button
                      type="button"
                      className="cs-accion cs-accion--peligro"
                      disabled={sensorOcupado !== null}
                      onClick={() => void cambiarSensor(sensor, 'eliminar')}
                      aria-label={`Eliminar el sensor ${sensor.codigo}`}
                      title="Eliminar sensor"
                    >
                      <IcTrash size={15} aria-hidden="true" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="cs" aria-labelledby={`cs-titulo-${galponId}`}>
      <header className="cs-cabecera">
        <div>
          <h3 id={`cs-titulo-${galponId}`}>Controladores y sensores</h3>
          <p>Conecta el ESP32 del galpón <strong>{galponCodigo}</strong> y elige qué variables medirá.</p>
        </div>
        <div className="cs-resumen">
          <span className={`cs-chip${disponibles.length ? ' cs-chip--ok' : ''}`}>{disponibles.length === 1 ? '1 controlador activo' : `${disponibles.length} controladores activos`}</span>
          <span className={`cs-chip${activos.length ? ' cs-chip--ok' : ''}`}>{activos.length === 1 ? '1 sensor activo' : `${activos.length} sensores activos`}</span>
        </div>
      </header>

      <ol className="cs-pasos" aria-label="Pasos para conectar el galpón">
        {['Controlador', 'Variables', 'Conexión'].map((paso, indice) => (
          <li key={paso} className={pasoListo[indice] ? 'is-listo' : ''}>
            <span className="cs-paso-numero" aria-hidden="true">{pasoListo[indice] ? <IcCheck size={13} /> : indice + 1}</span>
            <span className="cs-paso-texto">
              <small>Paso {indice + 1}</small>
              <strong>{paso}</strong>
            </span>
            <span className="cs-paso-estado">{pasoListo[indice] ? 'Listo' : 'Pendiente'}</span>
          </li>
        ))}
      </ol>

      <details className="cs-bloque" open={controladoresAbiertos} onToggle={evento => setControladoresAbiertos(evento.currentTarget.open)}>
        <summary className="cs-bloque-cabecera">
          <span className="cs-paso-numero" aria-hidden="true">1</span>
          <span className="cs-bloque-titulo">
            <strong>Controlador ESP32</strong>
            <small>El código y el token de conexión se generan solos para este galpón.</small>
          </span>
          <span className={`cs-estado${disponibles.length ? ' is-listo' : ''}`}>{disponibles.length ? 'Listo' : 'Pendiente'}</span>
          <IcChevronDown size={16} aria-hidden="true" className="cs-flecha" />
        </summary>
        <div className="cs-bloque-cuerpo">
          <DispositivosDeGalpon
            key={galponId}
            galpon={{ id: galponId, codigo: galponCodigo, nombre: galponNombre }}
            onCambio={actualizarControladores}
          />
        </div>
      </details>

      <div className="cs-bloque">
        <div className="cs-bloque-cabecera cs-bloque-cabecera--fija">
          <span className="cs-paso-numero" aria-hidden="true">2</span>
          <span className="cs-bloque-titulo">
            <strong>Variables a medir</strong>
            <small>Toca una variable para agregarla. Puedes agregar varias unidades.</small>
          </span>
        </div>
        <div className="cs-bloque-cuerpo">
          {cargando ? <p className="cs-nota" role="status">Cargando catálogo y controladores…</p> : errorCarga ? (
            <div className="cs-aviso cs-aviso--error" role="alert">
              <span>{errorCarga}</span>
              <button type="button" className="cs-boton" onClick={() => setRevision(actual => actual + 1)}>Reintentar</button>
            </div>
          ) : (
            <>
              {disponibles.length === 0 && (
                <p className="cs-aviso" role="status">Primero registra o activa un controlador ESP32 (paso 1). Después podrás guardar sensores.</p>
              )}
              {opciones.length > 0 ? (
                <div className="cs-catalogo" role="group" aria-label="Tipos de sensores disponibles">
                  {opciones.map(opcion => {
                    const elegidos = pendientes.filter(item => item.tipo === opcion.tipo).length
                    return (
                      <button
                        className={`cs-opcion${elegidos ? ' is-elegida' : ''}`}
                        type="button"
                        key={`${opcion.catalogo.id}-${opcion.tipo}`}
                        onClick={() => agregar(opcion)}
                        disabled={guardando}
                        aria-label={`Agregar sensor de ${opcion.nombre}`}
                      >
                        <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(opcion.tipo, 22)}</span>
                        <span className="cs-opcion-texto">
                          <strong>{opcion.nombre}</strong>
                          <small>{opcion.catalogo.descripcion || 'Variable ambiental del galpón'}</small>
                        </span>
                        <span className="cs-opcion-lado">
                          <span className="cs-opcion-unidad">{opcion.unidad}</span>
                          <span className="cs-opcion-mas" aria-hidden="true">{elegidos ? elegidos : <IcPlus size={14} />}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="cs-nota">No hay tipos de sensores activos en el catálogo.</p>
              )}

              {pendientes.length > 0 && (
                <div className="cs-pendientes">
                  <div className="cs-pendientes-cabecera">
                    <strong>Por registrar ({pendientes.length})</strong>
                    <small>Elige el controlador y, para temperatura y humedad, el GPIO del DHT22. Las dos variables del mismo DHT22 comparten GPIO.</small>
                  </div>
                  {pendientes.map(item => (
                    <div className="cs-pendiente" key={item.clave}>
                      <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(item.tipo, 20)}</span>
                      <span className="cs-opcion-texto">
                        <strong>{item.nombre}</strong>
                        <small>{item.unidad} · serial al guardar</small>
                      </span>
                      <label className="cs-campo">
                        <span>Controlador</span>
                        <select disabled={guardando} value={item.dispositivoId || ''} onChange={e => editar(item.clave, Number(e.target.value))} required>
                          <option value="" disabled>{disponibles.length ? 'Elige un controlador' : 'Sin ESP32 activo'}</option>
                          {disponibles.map(d => <option key={d.id} value={d.id}>{d.codigo_topic}</option>)}
                        </select>
                      </label>
                      {esVariableDht(item.tipo) ? (
                        <label className="cs-campo">
                          <span>GPIO del DHT22</span>
                          <select disabled={guardando} value={item.canal} onChange={evento => editarCanal(item.clave, evento.target.value)} required>
                            <OpcionesGpioDht />
                          </select>
                        </label>
                      ) : <span className="cs-nota cs-nota--celda">Necesita un lector compatible en el firmware.</span>}
                      <button type="button" className="cs-boton cs-boton--quitar" disabled={guardando} onClick={() => setPendientes(actuales => actuales.filter(p => p.clave !== item.clave))} aria-label={`Quitar sensor de ${item.nombre}`}>Quitar</button>
                    </div>
                  ))}
                  <div className="cs-pendientes-pie">
                    <button type="button" className="cs-boton cs-boton--principal" disabled={guardando || pendientes.some(p => !disponibles.some(d => d.id === p.dispositivoId) || (esVariableDht(p.tipo) && !p.canal))} onClick={() => void registrar()}>
                      {guardando ? 'Registrando…' : `Registrar ${pendientes.length} sensor${pendientes.length === 1 ? '' : 'es'}`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p className="cs-aviso cs-aviso--error" role="alert">{error}</p>}
          {mensaje && <p className="cs-aviso cs-aviso--ok" role="status">{mensaje}</p>}
        </div>
      </div>

      <details className="cs-bloque" open={relesAbiertos} onToggle={evento => setRelesAbiertos(evento.currentTarget.open)}>
        <summary className="cs-bloque-cabecera">
          <span className="cs-paso-numero" aria-hidden="true">K</span>
          <span className="cs-bloque-titulo">
            <strong>Actuadores (relés K1-K4){!cargando && !errorCarga ? ` (${reles.length})` : ''}</strong>
            <small>Regístralos por ESP32 con un clic y edita su ficha. Se controlan desde Monitoreo → Actuadores.</small>
          </span>
          <span className={`cs-estado${relesListos ? ' is-listo' : ''}`}>
            {reles.length === 0 ? 'Sin relés' : relesListos ? 'Por canal' : 'Revisar'}
          </span>
          <IcChevronDown size={16} aria-hidden="true" className="cs-flecha" />
        </summary>
        <div className="cs-bloque-cuerpo">
          {cargando ? <p className="cs-nota" role="status">Cargando actuadores…</p> : errorCarga ? (
            <p className="cs-aviso cs-aviso--error">La lista de actuadores no está disponible. Vuelve a cargar los datos.</p>
          ) : (
            <RelesDelGalpon
              galponId={galponId}
              dispositivos={disponibles}
              sensores={sensores}
              puedeGestionar={puedeRegistrar}
              onCambio={actualizarControladores}
            />
          )}
        </div>
      </details>

      <details className="cs-bloque">
        <summary className="cs-bloque-cabecera">
          <span className="cs-paso-numero" aria-hidden="true">3</span>
          <span className="cs-bloque-titulo">
            <strong>Sensores registrados{!cargando && !errorCarga ? ` (${activos.length})` : ''}</strong>
            <small>Cada sensor tiene su serial. Las conexiones DHT22 se actualizan solas cada 30 segundos.</small>
          </span>
          <span className={`cs-estado${pasoListo[2] ? ' is-listo' : ''}`}>{activos.length === 0 ? 'Sin sensores' : pasoListo[2] ? 'Conectados' : `${activos.length - conCanal} sin conexión`}</span>
          <IcChevronDown size={16} aria-hidden="true" className="cs-flecha" />
        </summary>
        <div className="cs-bloque-cuerpo">
          {cargando ? <p className="cs-nota" role="status">Cargando sensores…</p> : errorCarga ? <p className="cs-aviso cs-aviso--error">La lista de sensores no está disponible. Vuelve a cargar los datos.</p> : (
            <>
              {activos.length === 0
                ? <p className="cs-nota">No hay sensores activos en este galpón.</p>
                : tablaSensores(activos, 'Sensores activos')}
              {desactivados.length > 0 && (
                <details className="cs-desactivados">
                  <summary>
                    <IcChevronDown size={14} aria-hidden="true" className="cs-flecha" />
                    Desactivados ({desactivados.length})
                    <small>No envían lecturas al monitoreo. Actívalos de nuevo o elimínalos.</small>
                  </summary>
                  {tablaSensores(desactivados, 'Sensores desactivados')}
                </details>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  )
}

export default AsignarSensores
