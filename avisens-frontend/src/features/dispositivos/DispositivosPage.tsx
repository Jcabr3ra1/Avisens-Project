import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import PanelFirmware from '@features/firmware/components/PanelFirmware'
import { useFirmware } from '@features/firmware/hooks/useFirmware'
import { listarSensores, type Sensor } from '@features/sensores/api/sensores'
import { IcChevronDown, IcChevronRight, IcChip, IcSearch } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { listarDispositivos, type Dispositivo } from './api/dispositivos'
import DetalleGalpon from './components/DetalleGalpon'
import HeroDispositivos from './components/HeroDispositivos'
import {
  agruparPorOrganizacion, cumpleFiltro, filasFlota, granjasParaMaqueta, resumenFlota,
  type EstadoGalponFlota, type FiltroFlota,
} from './model/flota'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import '@features/organizaciones/OrganizacionesPage.css'
import './DispositivosPage.css'

type Pestana = 'galpones' | 'firmware'

const FILTROS: { id: FiltroFlota; etiqueta: string }[] = [
  { id: 'todos', etiqueta: 'Todos los galpones' },
  { id: 'en_linea', etiqueta: 'En línea' },
  { id: 'problemas', etiqueta: 'Con problemas' },
  { id: 'sin_controlador', etiqueta: 'Sin controlador' },
]

const ETIQUETA: Record<EstadoGalponFlota, string> = {
  conectado: 'En línea',
  sin_reportar: 'Sin reportar',
  nunca: 'Nunca reportó',
  sin_controlador: 'Sin controlador',
}

const PRIORIDAD: Record<EstadoGalponFlota, number> = { nunca: 0, sin_reportar: 1, conectado: 2, sin_controlador: 3 }

function DispositivosPage() {
  const [parametros, setParametros] = useSearchParams()
  const [pestana, setPestana] = useState<Pestana>(parametros.get('pestana') === 'firmware' ? 'firmware' : 'galpones')
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroFlota>('todos')
  const firmware = useFirmware()

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [listaGalpones, listaDispositivos, listaSensores] = await Promise.all([
        listarGalpones(), listarDispositivos(), listarSensores(),
      ])
      setGalpones(listaGalpones)
      setDispositivos(listaDispositivos)
      setSensores(listaSensores)
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudieron cargar los controladores.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const filas = useMemo(() => filasFlota(galpones, dispositivos), [galpones, dispositivos])
  const sensoresPorGalpon = useMemo(() => {
    const conteo = new Map<number, number>()
    for (const sensor of sensores) {
      if (sensor.estado === 'activo') conteo.set(sensor.galpon.id, (conteo.get(sensor.galpon.id) ?? 0) + 1)
    }
    return conteo
  }, [sensores])
  const granjas = useMemo(() => granjasParaMaqueta(filas, sensoresPorGalpon), [filas, sensoresPorGalpon])
  const publicada = firmware.versiones.find((version) => version.vigente)?.version ?? null
  const resumen = resumenFlota(filas, publicada)
  const grupos = useMemo(
    () => agruparPorOrganizacion(filas.filter((fila) => cumpleFiltro(fila, filtro)), busqueda)
      .map((grupo) => ({ ...grupo, filas: [...grupo.filas].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado]) })),
    [filas, filtro, busqueda],
  )
  const visibles = grupos.flatMap((grupo) => grupo.filas)
  const pedido = Number(parametros.get('galpon'))
  const seleccionada = visibles.find((fila) => fila.galpon.id === pedido) ?? visibles[0] ?? null
  const ultimaSenal = filas.reduce<string | null>((ultima, fila) =>
    fila.ultimaConexion && (!ultima || fila.ultimaConexion > ultima) ? fila.ultimaConexion : ultima, null)

  function cambiarParametro(clave: string, valor: string) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set(clave, valor)
      return siguientes
    }, { replace: true })
  }

  function seleccionar(galponId: number) {
    cambiarParametro('galpon', String(galponId))
  }

  function elegirGranja(granjaId: number) {
    const fila = filas.find((item) => item.galpon.granja.id === granjaId)
    if (!fila) return
    setPestana('galpones')
    setFiltro('todos')
    setBusqueda('')
    seleccionar(fila.galpon.id)
    window.requestAnimationFrame(() => document.getElementById('dsp-cuerpo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function cambiarPestana(siguiente: Pestana) {
    setPestana(siguiente)
    cambiarParametro('pestana', siguiente)
  }

  return (
    <div className="page-container adm-page flota-page">
      <HeroDispositivos
        granjas={granjas}
        granjaResaltada={seleccionada?.galpon.granja.id ?? null}
        conectados={resumen.conectados}
        controladores={resumen.controladores}
        sinReportar={filas.filter((fila) => cumpleFiltro(fila, 'problemas')).length}
        sinControlador={filas.filter((fila) => fila.estado === 'sin_controlador').length}
        sensores={sensores.filter((sensor) => sensor.estado === 'activo').length}
        alDia={resumen.alDia}
        versionPublicada={publicada}
        ultimaSenal={ultimaSenal}
        cargando={cargando}
        onElegirGranja={elegirGranja}
        onActualizar={() => { void recargar(); void firmware.recargar() }}
      />

      <div className="flota-tabs" role="tablist" aria-label="Dispositivos">
        <button type="button" role="tab" id="tab-galpones" aria-selected={pestana === 'galpones'} aria-controls="panel-galpones" className="flota-tab" onClick={() => cambiarPestana('galpones')}>
          Galpones y sensores <span>{filas.length}</span>
        </button>
        <button type="button" role="tab" id="tab-firmware" aria-selected={pestana === 'firmware'} aria-controls="panel-firmware" className="flota-tab" onClick={() => cambiarPestana('firmware')}>
          Actualizaciones de firmware <span>{publicada ? `v${publicada}` : firmware.versiones.length}</span>
        </button>
      </div>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      {pestana === 'galpones' && (
        <section id="panel-galpones" role="tabpanel" aria-labelledby="tab-galpones" className="flota-galpones">
          <div className="org-lista-herramientas">
            <label className="org-lista-buscador">
              <span className="sr-only">Buscar galpón</span>
              <IcSearch size={18} aria-hidden="true" />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar galpón, granja, organización o controlador…"
                autoComplete="off"
              />
            </label>
            <label className="org-lista-desplegable">
              <span className="sr-only">Filtrar por estado</span>
              <select value={filtro} onChange={(evento) => setFiltro(evento.target.value as FiltroFlota)}>
                {FILTROS.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.etiqueta} ({filas.filter((fila) => cumpleFiltro(fila, opcion.id)).length})
                  </option>
                ))}
              </select>
              <IcChevronDown size={18} aria-hidden="true" />
            </label>
          </div>

          <div className="flota-cuerpo" id="dsp-cuerpo">
            <section className="org-lista-columna" aria-labelledby="dsp-lista-titulo">
              <div className="org-lista-columna-cabecera">
                <h2 id="dsp-lista-titulo">Galpones</h2>
                {!cargando && <span role="status">{visibles.length === 1 ? '1 resultado' : `${visibles.length} resultados`}</span>}
              </div>

              {cargando && filas.length === 0 ? (
                <ul className="org-lista-tarjetas" aria-hidden="true">
                  {[0, 1, 2].map((indice) => <li key={indice} className="org-lista-tarjeta-esqueleto org-brilla" />)}
                </ul>
              ) : visibles.length === 0 ? (
                <div className="org-lista-vacio">
                  <IcSearch size={28} aria-hidden="true" />
                  <h3>Sin coincidencias</h3>
                  <p>Ningún galpón coincide con la búsqueda o el estado elegido.</p>
                </div>
              ) : (
                grupos.map((grupo) => (
                  <div key={grupo.organizacion} className="flota-grupo">
                    <h3 className="flota-grupo-titulo">{grupo.organizacion}</h3>
                    <ul className="org-lista-tarjetas" role="radiogroup" aria-label={`Galpones de ${grupo.organizacion}`}>
                      {grupo.filas.map((fila, indice) => {
                        const activa = fila.galpon.id === seleccionada?.galpon.id
                        return (
                          <li
                            key={fila.galpon.id}
                            className={`org-lista-item org-aparece${activa ? ' is-seleccionada' : ''}`}
                            style={{ '--orden': Math.min(indice, 8) } as CSSProperties}
                          >
                            <label className="org-lista-tarjeta">
                              <input
                                type="radio"
                                name="galpon"
                                className="sr-only"
                                checked={activa}
                                onChange={() => seleccionar(fila.galpon.id)}
                              />
                              <span className={`org-lista-avatar flota-avatar flota-avatar--${fila.estado}`} aria-hidden="true">
                                <IcChip size={20} />
                              </span>
                              <span className="org-lista-tarjeta-info">
                                <span className="org-lista-tarjeta-nombre">{fila.galpon.nombre}</span>
                                <span className="org-lista-tarjeta-meta">
                                  <span>{fila.granja}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{fila.galpon.codigo}</span>
                                </span>
                              </span>
                              <span className="org-lista-tarjeta-derecha">
                                <span className={`flota-estado flota-estado--${fila.estado}`}>
                                  <span className="flota-estado-punto" aria-hidden="true" />
                                  {ETIQUETA[fila.estado]}
                                </span>
                              </span>
                              <span className="org-lista-tarjeta-pie">
                                <span className="org-lista-conteo-item">
                                  {fila.controladores.length === 0
                                    ? 'Sin controlador'
                                    : fila.controladores.length === 1 ? '1 controlador' : `${fila.controladores.length} controladores`}
                                </span>
                                <span className="org-lista-conteo-item">
                                  {(() => {
                                    const total = sensoresPorGalpon.get(fila.galpon.id) ?? 0
                                    return total === 1 ? '1 sensor' : `${total} sensores`
                                  })()}
                                </span>
                                <span className="org-lista-tarjeta-accion" aria-hidden="true">
                                  {activa ? 'Seleccionado' : <>Configurar <IcChevronRight size={15} /></>}
                                </span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </section>

            <DetalleGalpon
              fila={seleccionada}
              sensores={seleccionada ? sensoresPorGalpon.get(seleccionada.galpon.id) ?? 0 : 0}
              versionPublicada={publicada}
              cargando={cargando}
              onCambio={recargar}
            />
          </div>
        </section>
      )}

      {pestana === 'firmware' && (
        <PanelFirmware
          versiones={firmware.versiones}
          controladores={filas.flatMap((fila) => fila.controladores)}
          cargando={firmware.cargando}
          error={firmware.error}
          onSubir={firmware.subir}
          onPublicar={firmware.publicar}
          onRetirar={firmware.retirar}
          onEliminar={firmware.eliminar}
          onReintentar={() => void firmware.recargar()}
        />
      )}
    </div>
  )
}

export default DispositivosPage
