import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
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
import { IcPlus, IcTrash } from '@shared/ui/icons/icons'
import './MonitoreoPage.css'
import './AsignarSensores.css'
import ConexionDhtSensor, { OpcionesGpioDht } from './ConexionDhtSensor'
import { esVariableDht } from './conexionDht'
import RelesDelGalpon from '@features/sensores/components/RelesDelGalpon'
import { esSensorRele } from '@features/sensores/model/reles'

type SeccionConfig = 'controladores' | 'sensores' | 'reles'

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
  return catalogo.flatMap((item) => {
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
  const [seccionManual, setSeccionManual] = useState<SeccionConfig | null>(null)
  const [verDesactivados, setVerDesactivados] = useState(false)
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
        setCatalogo(elementos.filter((item) => item.activo))
        setDispositivos(listaDispositivos)
        setSensores(listaSensores.filter((sensor) => sensor.galpon.id === galponId))
      })
      .catch((problema) => {
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
    setSeccionManual(null)
    setVerDesactivados(false)
  }, [galponId])

  const disponibles = dispositivos.filter((dispositivo) => dispositivo.galpon.id === galponId && dispositivo.activo)
  const seccion: SeccionConfig = seccionManual ?? (disponibles.length > 0 ? 'sensores' : 'controladores')

  function actualizarControladores() {
    setRevision((actual) => actual + 1)
    void recargar()
  }

  function agregar(opcion: OpcionCatalogoSensor) {
    setPendientes((actuales) => [...actuales, {
      clave: siguienteClave.current++,
      tipo: opcion.tipo,
      nombre: opcion.nombre,
      unidad: opcion.unidad,
      dispositivoId: disponibles.length === 1 ? disponibles[0].id : 0,
      canal: '',
    }])
    setMensaje('')
    setError('')
  }

  function editarCanal(clave: number, canal: string) {
    setPendientes((actuales) => actuales.map((item) => (item.clave === clave ? { ...item, canal } : item)))
  }

  function editar(clave: number, dispositivoId: number) {
    setPendientes((actuales) => actuales.map((item) => (item.clave === clave ? { ...item, dispositivoId } : item)))
  }

  async function cambiarSensor(sensor: Sensor, accion: 'activar' | 'desactivar' | 'eliminar') {
    if (sensorOcupado !== null) return
    const nombre = `${etiquetaTipo(sensor.tipo)} (${sensor.codigo})`
    const aplicar = async () => {
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
      } finally {
        setSensorOcupado(null)
      }
    }
    if (accion === 'activar') {
      try { await aplicar() }
      catch (problema) { setError(mensajeDeError(problema, 'No se pudo actualizar el sensor.')) }
      return
    }
    await confirmarAccion({
      titulo: accion === 'eliminar' ? '¿Eliminar este sensor?' : '¿Desactivar este sensor?',
      entidad: nombre,
      descripcion: accion === 'eliminar'
        ? 'Dejará de aparecer en AVISENS. Si tiene lecturas o alertas, su historial se conserva para los reportes.'
        : 'Deja de contar en el monitoreo. Sus lecturas guardadas se conservan.',
      textoConfirmar: accion === 'eliminar' ? 'Eliminar sensor' : 'Desactivar sensor',
      textoProcesando: accion === 'eliminar' ? 'Eliminando…' : 'Desactivando…',
      tono: accion === 'eliminar' ? 'peligro' : 'aviso',
      onConfirmar: aplicar,
    })
  }

  async function registrar() {
    if (guardando || cargando || pendientes.length === 0 || pendientes.some((item) => !disponibles.some((d) => d.id === item.dispositivoId) || (esVariableDht(item.tipo) && !item.canal))) return
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
      setMensaje(`Se registraron ${creados} sensor${creados === 1 ? '' : 'es'} en ${galponNombre}. Seriales: ${codigosCreados.join(', ')}.`)
      await recargar()
    } catch (problema) {
      setPendientes((actuales) => actuales.filter((item) => !clavesCreadas.includes(item.clave)))
      setError(`${creados > 0 ? `Se registraron ${creados}; ` : ''}${mensajeDeError(problema, 'No se pudo completar el registro.')}`)
      if (codigosCreados.length > 0) {
        setMensaje(`Sensores ya registrados: ${codigosCreados.join(', ')}.`)
      }
      if (creados > 0) await recargar()
    } finally {
      if (creados > 0) setRevision((actual) => actual + 1)
      setGuardando(false)
    }
  }

  function etiquetaTipo(tipo: string) {
    return opciones.find((opcion) => opcion.tipo === tipo)?.nombre ?? tipo.replace(/_/g, ' ')
  }

  if (!puedeRegistrar) return null

  const reles = sensores.filter(esSensorRele)
  const sensoresMedicion = sensores.filter((sensor) => !esSensorRele(sensor))
  const activos = sensoresMedicion.filter((sensor) => sensor.estado !== 'inactivo')
  const desactivados = sensoresMedicion.filter((sensor) => sensor.estado === 'inactivo')

  function tarjetaSensor(sensor: Sensor) {
    const inactivo = sensor.estado === 'inactivo'
    return (
      <li
        key={sensor.id}
        className={`cs-sensor-card${inactivo ? ' is-inactivo' : ''}`}
        aria-busy={sensorOcupado === sensor.id}
      >
        <div className="cs-sensor-card-top">
          <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(sensor.tipo, 18)}</span>
          <div className="cs-sensor-card-info">
            <div className="cs-sensor-card-linea">
              <strong>{etiquetaTipo(sensor.tipo)}</strong>
              <span className={`cs-sensor-estado cs-sensor-estado--${sensor.estado}`}>
                {sensor.estado === 'activo' ? 'Activo' : inactivo ? 'Inactivo' : sensor.estado}
              </span>
            </div>
            <div className="cs-sensor-card-codigos">
              <code className="cs-codigo">{sensor.codigo}</code>
              <code className="cs-codigo">{sensor.dispositivo.codigo_topic}</code>
              <span className="cs-sensor-unidad">{sensor.unidad_medida}</span>
            </div>
          </div>
          <div className="cs-acciones">
            <button
              type="button"
              className="cs-accion"
              disabled={sensorOcupado !== null}
              onClick={() => void cambiarSensor(sensor, inactivo ? 'activar' : 'desactivar')}
            >
              {inactivo ? 'Activar' : 'Desactivar'}
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
          </div>
        </div>

        <div className="cs-sensor-card-conexion">
          {inactivo ? (
            <span className="cs-nota">Conexión: {sensor.canal ?? 'Sin asignar'}</span>
          ) : esVariableDht(sensor.tipo) ? (
            <ConexionDhtSensor
              key={`${sensor.id}-${sensor.canal}`}
              sensor={sensor}
              alGuardar={() => {
                setMensaje(`Conexión de ${sensor.codigo} guardada.`)
                actualizarControladores()
              }}
            />
          ) : (
            <span className="cs-nota">Conexión: {sensor.canal ?? 'Lector por serial'}</span>
          )}
        </div>
      </li>
    )
  }

  return (
    <section className="cs" aria-label={`Configuración del galpón ${galponNombre}`}>
      <div className="cs-subtabs" role="tablist" aria-label="Secciones de configuración del galpón">
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'controladores'}
          className={`cs-subtab${seccion === 'controladores' ? ' is-activa' : ''}`}
          onClick={() => setSeccionManual('controladores')}
        >
          Controladores ESP32
          <span>{disponibles.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'sensores'}
          className={`cs-subtab${seccion === 'sensores' ? ' is-activa' : ''}`}
          onClick={() => setSeccionManual('sensores')}
        >
          Sensores
          <span>{activos.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'reles'}
          className={`cs-subtab${seccion === 'reles' ? ' is-activa' : ''}`}
          onClick={() => setSeccionManual('reles')}
        >
          Relés K1-K4
          <span>{reles.length}</span>
        </button>
      </div>

      {seccion === 'controladores' && (
        <div className="cs-panel">
          <DispositivosDeGalpon
            key={galponId}
            galpon={{ id: galponId, codigo: galponCodigo, nombre: galponNombre }}
            onCambio={actualizarControladores}
          />
        </div>
      )}

      {seccion === 'sensores' && (
        <div className="cs-panel cs-panel--stack">
          {error && <p className="cs-aviso cs-aviso--error" role="alert">{error}</p>}
          {mensaje && <p className="cs-aviso cs-aviso--ok" role="status">{mensaje}</p>}

          <div className="cs-seccion">
            <header className="cs-seccion-head">
              <div>
                <h4>Agregar variables a medir</h4>
                <p>Toca una variable del catálogo para agregarla al galpón.</p>
              </div>
            </header>

            {cargando ? (
              <p className="cs-nota" role="status">Cargando catálogo y controladores…</p>
            ) : errorCarga ? (
              <div className="cs-aviso cs-aviso--error" role="alert">
                <span>{errorCarga}</span>
                <button type="button" className="cs-boton" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>
              </div>
            ) : (
              <>
                {disponibles.length === 0 && (
                  <div className="cs-aviso" role="status">
                    <span>Primero registra o activa un controlador ESP32 para poder guardar sensores.</span>
                    <button type="button" className="cs-boton" onClick={() => setSeccionManual('controladores')}>
                      Ir a Controladores
                    </button>
                  </div>
                )}

                {opciones.length > 0 ? (
                  <div className="cs-catalogo" role="group" aria-label="Tipos de sensores disponibles">
                    {opciones.map((opcion) => {
                      const elegidos = pendientes.filter((item) => item.tipo === opcion.tipo).length
                      return (
                        <button
                          className={`cs-opcion${elegidos ? ' is-elegida' : ''}`}
                          type="button"
                          key={`${opcion.catalogo.id}-${opcion.tipo}`}
                          onClick={() => agregar(opcion)}
                          disabled={guardando}
                          aria-label={`Agregar sensor de ${opcion.nombre}`}
                        >
                          <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(opcion.tipo, 20)}</span>
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
                      <small>Elige el controlador y, para temperatura o humedad, el GPIO del DHT22.</small>
                    </div>
                    {pendientes.map((item) => (
                      <div className="cs-pendiente" key={item.clave}>
                        <div className="cs-pendiente-top">
                          <span className="cs-opcion-icono" aria-hidden="true">{iconoSensor(item.tipo, 18)}</span>
                          <span className="cs-opcion-texto">
                            <strong>{item.nombre}</strong>
                            <small>{item.unidad} · serial automático al guardar</small>
                          </span>
                          <button
                            type="button"
                            className="cs-boton cs-boton--quitar"
                            disabled={guardando}
                            onClick={() => setPendientes((actuales) => actuales.filter((p) => p.clave !== item.clave))}
                            aria-label={`Quitar sensor de ${item.nombre}`}
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="cs-pendiente-campos">
                          <label className="cs-campo">
                            <span>Controlador</span>
                            <select disabled={guardando} value={item.dispositivoId || ''} onChange={(e) => editar(item.clave, Number(e.target.value))} required>
                              <option value="" disabled>{disponibles.length ? 'Elige un controlador' : 'Sin ESP32 activo'}</option>
                              {disponibles.map((d) => <option key={d.id} value={d.id}>{d.codigo_topic}</option>)}
                            </select>
                          </label>
                          {esVariableDht(item.tipo) ? (
                            <label className="cs-campo">
                              <span>GPIO del DHT22</span>
                              <select disabled={guardando} value={item.canal} onChange={(evento) => editarCanal(item.clave, evento.target.value)} required>
                                <OpcionesGpioDht />
                              </select>
                            </label>
                          ) : (
                            <span className="cs-nota cs-nota--celda">Lector por serial en firmware</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="cs-pendientes-pie">
                      <button
                        type="button"
                        className="cs-boton cs-boton--principal"
                        disabled={guardando || pendientes.some((p) => !disponibles.some((d) => d.id === p.dispositivoId) || (esVariableDht(p.tipo) && !p.canal))}
                        onClick={() => void registrar()}
                      >
                        {guardando ? 'Registrando…' : `Registrar ${pendientes.length} sensor${pendientes.length === 1 ? '' : 'es'}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="cs-seccion">
            <header className="cs-seccion-head">
              <div>
                <h4>Sensores registrados ({activos.length})</h4>
                <p>Cada sensor tiene su serial. Los pines DHT22 se sincronizan solos con el ESP32.</p>
              </div>
              {desactivados.length > 0 && (
                <button
                  type="button"
                  className="cs-btn-desactivados"
                  onClick={() => setVerDesactivados((actual) => !actual)}
                >
                  {verDesactivados ? 'Ocultar desactivados' : `Ver desactivados (${desactivados.length})`}
                </button>
              )}
            </header>

            {cargando ? (
              <p className="cs-nota" role="status">Cargando sensores…</p>
            ) : errorCarga ? (
              <p className="cs-aviso cs-aviso--error">La lista de sensores no está disponible.</p>
            ) : activos.length === 0 ? (
              <div className="cs-vacio">
                <p>No hay sensores activos en este galpón. Agrega uno arriba para empezar.</p>
              </div>
            ) : (
              <ul className="cs-sensores-lista" aria-label="Sensores activos">
                {activos.map(tarjetaSensor)}
              </ul>
            )}

            {verDesactivados && desactivados.length > 0 && (
              <ul className="cs-sensores-lista cs-sensores-lista--desactivados" aria-label="Sensores desactivados">
                {desactivados.map(tarjetaSensor)}
              </ul>
            )}
          </div>
        </div>
      )}

      {seccion === 'reles' && (
        <div className="cs-panel">
          {cargando ? (
            <p className="cs-nota" role="status">Cargando actuadores…</p>
          ) : errorCarga ? (
            <p className="cs-aviso cs-aviso--error">La lista de actuadores no está disponible.</p>
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
      )}
    </section>
  )
}

export default AsignarSensores
