import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import PanelFirmware from '@features/firmware/components/PanelFirmware'
import { useFirmware } from '@features/firmware/hooks/useFirmware'
import { listarSensores, type Sensor } from '@features/sensores/api/sensores'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcChevronRight, IcChip, IcClose, IcSearch } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { hace } from '@shared/utils/fechas'
import { listarDispositivos, type Dispositivo } from './api/dispositivos'
import DetalleGalpon from './components/DetalleGalpon'
import {
  agruparPorOrganizacion,
  cumpleFiltro,
  filasFlota,
  resumenFlota,
  siguienteGalponId,
  type EstadoGalponFlota,
  type FiltroFlota,
} from './model/flota'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './DispositivosPage.css'

type Pestana = 'galpones' | 'firmware'

const ETIQUETA: Record<EstadoGalponFlota, string> = {
  conectado: 'En línea',
  sin_reportar: 'Sin reportar',
  nunca: 'Nunca reportó',
  sin_controlador: 'Sin controlador',
}

const PRIORIDAD: Record<EstadoGalponFlota, number> = { nunca: 0, sin_reportar: 1, conectado: 2, sin_controlador: 3 }

function IndicadorFiltro({ etiqueta, valor, nota, activo, tono, orden, onClick }: {
  etiqueta: string
  valor: number | null
  nota: string
  activo: boolean
  tono?: 'peligro' | 'alerta'
  orden: number
  onClick: () => void
}) {
  return (
    <li className="flota-indicador org-aparece" style={{ '--orden': orden } as CSSProperties}>
      <button
        type="button"
        className={`flota-indicador-btn${activo ? ' is-activo' : ''}${tono ? ` is-${tono}` : ''}`}
        aria-pressed={activo}
        onClick={onClick}
      >
        <span className="flota-indicador-label">{etiqueta}</span>
        <strong className="flota-indicador-valor">
          {valor === null ? <span className="flota-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
        </strong>
        <span className="flota-indicador-nota">{nota}</span>
      </button>
    </li>
  )
}

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
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false)
  const buscadorRef = useRef<HTMLInputElement>(null)
  const firmware = useFirmware()

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError('')
    try {
      const [listaGalpones, listaDispositivos, listaSensores] = await Promise.all([
        listarGalpones(), listarDispositivos(), listarSensores(),
      ])
      setGalpones(listaGalpones)
      setDispositivos(listaDispositivos)
      setSensores(listaSensores)
    } catch (problema) {
      if (!silencioso) setError(mensajeDeError(problema, 'No se pudieron cargar los controladores.'))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  useRefetchOnFocus(() => {
    void recargar(true)
    void firmware.recargar()
  })

  useEffect(() => {
    function atajoBuscar(evento: globalThis.KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement) return
      if (pestana !== 'galpones') return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', atajoBuscar)
    return () => window.removeEventListener('keydown', atajoBuscar)
  }, [pestana])

  const filas = useMemo(() => filasFlota(galpones, dispositivos), [galpones, dispositivos])
  const sensoresPorGalpon = useMemo(() => {
    const conteo = new Map<number, number>()
    for (const sensor of sensores) {
      if (sensor.estado === 'activo') conteo.set(sensor.galpon.id, (conteo.get(sensor.galpon.id) ?? 0) + 1)
    }
    return conteo
  }, [sensores])

  const publicada = firmware.versiones.find((version) => version.vigente)?.version ?? null
  const resumen = useMemo(() => resumenFlota(filas, publicada), [filas, publicada])
  const sensoresActivos = useMemo(() => sensores.filter((s) => s.estado === 'activo').length, [sensores])
  const enLinea = useMemo(() => filas.filter((f) => cumpleFiltro(f, 'en_linea')).length, [filas])
  const conProblemas = useMemo(() => filas.filter((f) => cumpleFiltro(f, 'problemas')).length, [filas])
  const sinControlador = useMemo(() => filas.filter((f) => f.estado === 'sin_controlador').length, [filas])

  const grupos = useMemo(
    () => agruparPorOrganizacion(filas.filter((fila) => cumpleFiltro(fila, filtro)), busqueda)
      .map((grupo) => ({ ...grupo, filas: [...grupo.filas].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado]) })),
    [filas, filtro, busqueda],
  )
  const visibles = useMemo(() => grupos.flatMap((grupo) => grupo.filas), [grupos])
  const idsVisibles = useMemo(() => visibles.map((fila) => fila.galpon.id), [visibles])
  const pedido = Number(parametros.get('galpon'))
  const seleccionada = visibles.find((fila) => fila.galpon.id === pedido) ?? visibles[0] ?? null
  const ultimaSenal = useMemo(
    () => filas.reduce<string | null>((ultima, fila) =>
      fila.ultimaConexion && (!ultima || fila.ultimaConexion > ultima) ? fila.ultimaConexion : ultima, null),
    [filas],
  )
  const listo = !cargando && !error
  const hayFiltros = busqueda.trim() !== '' || filtro !== 'todos'

  function cambiarParametro(clave: string, valor: string) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set(clave, valor)
      return siguientes
    }, { replace: true })
  }

  function seleccionar(galponId: number, abrirEnMovil = false) {
    cambiarParametro('galpon', String(galponId))
    if (abrirEnMovil && window.matchMedia('(max-width: 64rem)').matches) {
      setPanelMovilAbierto(true)
    }
  }

  function cambiarPestana(siguiente: Pestana) {
    setPestana(siguiente)
    cambiarParametro('pestana', siguiente)
  }

  function elegirFiltro(nuevoFiltro: FiltroFlota) {
    if (pestana !== 'galpones') cambiarPestana('galpones')
    setFiltro(nuevoFiltro)
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltro('todos')
  }

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguienteId = siguienteGalponId(idsVisibles, seleccionada?.galpon.id ?? null, evento.key)
    if (siguienteId === null) return
    evento.preventDefault()
    seleccionar(siguienteId, false)
  }

  return (
    <div className="page-container adm-page flota-page">
      <header className="flota-cabecera org-aparece">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Campo
          </span>
          <h1 className="flota-titulo">Dispositivos</h1>
          <p className="flota-subtitulo">
            Controladores ESP32, sensores en vivo y firmware OTA de los galpones.
            {ultimaSenal ? ` Última señal ${hace(ultimaSenal)}.` : ''}
          </p>
        </div>

        <div className="flota-tabs" role="tablist" aria-label="Secciones de dispositivos">
          <button
            type="button"
            role="tab"
            id="tab-galpones"
            aria-selected={pestana === 'galpones'}
            aria-controls="panel-galpones"
            className="flota-tab"
            onClick={() => cambiarPestana('galpones')}
          >
            Galpones
            <span>{filas.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-firmware"
            aria-selected={pestana === 'firmware'}
            aria-controls="panel-firmware"
            className="flota-tab"
            onClick={() => cambiarPestana('firmware')}
          >
            Firmware
            <span>{publicada ? `v${publicada}` : firmware.versiones.length}</span>
          </button>
        </div>
      </header>

      <ul className="flota-indicadores" aria-label="Filtros rápidos de flota">
        <IndicadorFiltro
          orden={1}
          etiqueta="Galpones"
          valor={listo ? filas.length : null}
          nota={!listo ? 'Calculando…' : `${resumen.controladores} ESP32 · ${sensoresActivos} sensores`}
          activo={pestana === 'galpones' && filtro === 'todos'}
          onClick={() => elegirFiltro('todos')}
        />
        <IndicadorFiltro
          orden={2}
          etiqueta="En línea"
          valor={listo ? enLinea : null}
          nota={resumen.alDia !== null ? `${resumen.alDia} con firmware al día` : 'Reportando ahora'}
          activo={pestana === 'galpones' && filtro === 'en_linea'}
          onClick={() => elegirFiltro(filtro === 'en_linea' ? 'todos' : 'en_linea')}
        />
        <IndicadorFiltro
          orden={3}
          etiqueta="Con problemas"
          valor={listo ? conProblemas : null}
          nota={conProblemas > 0 ? 'Sin reportar o sin señal' : 'Sin incidencias'}
          activo={pestana === 'galpones' && filtro === 'problemas'}
          tono={conProblemas > 0 ? 'peligro' : undefined}
          onClick={() => elegirFiltro(filtro === 'problemas' ? 'todos' : 'problemas')}
        />
        <IndicadorFiltro
          orden={4}
          etiqueta="Sin controlador"
          valor={listo ? sinControlador : null}
          nota="Listos para equipar"
          activo={pestana === 'galpones' && filtro === 'sin_controlador'}
          tono={sinControlador > 0 ? 'alerta' : undefined}
          onClick={() => elegirFiltro(filtro === 'sin_controlador' ? 'todos' : 'sin_controlador')}
        />
      </ul>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      {pestana === 'galpones' && (
        <section id="panel-galpones" role="tabpanel" aria-labelledby="tab-galpones" className="flota-galpones">
          <div className="flota-herramientas org-aparece" style={{ '--orden': 2 } as CSSProperties}>
            <label className="flota-buscador">
              <span className="sr-only">Buscar galpón</span>
              <IcSearch size={16} aria-hidden="true" />
              <input
                ref={buscadorRef}
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar galpón, granja, cliente o código ESP32…"
                autoComplete="off"
              />
              {busqueda ? (
                <button
                  type="button"
                  className="flota-limpiar-busqueda"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                >
                  <IcClose size={13} aria-hidden="true" />
                </button>
              ) : (
                <kbd aria-hidden="true">/</kbd>
              )}
            </label>

            <span className="flota-conteo" role="status">
              {visibles.length === 1 ? '1 galpón' : `${visibles.length} galpones`}
            </span>

            {hayFiltros && (
              <button type="button" className="flota-filtro-limpiar" onClick={limpiarFiltros}>
                Limpiar <IcClose size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flota-cuerpo" id="dsp-cuerpo">
            <section className="flota-columna" aria-label="Lista de galpones">
              {cargando && filas.length === 0 ? (
                <ul className="flota-lista" aria-hidden="true">
                  {[0, 1, 2, 3].map((indice) => <li key={indice} className="flota-tarjeta-esqueleto org-brilla" />)}
                </ul>
              ) : visibles.length === 0 ? (
                <div className="flota-vacio">
                  <IcSearch size={26} aria-hidden="true" />
                  <h3>Sin coincidencias</h3>
                  <p>Ningún galpón coincide con la búsqueda o el filtro activo.</p>
                  {hayFiltros && (
                    <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-label="Galpones de la flota"
                  tabIndex={0}
                  className="flota-listbox"
                  onKeyDown={manejarTecladoLista}
                >
                  {grupos.map((grupo) => (
                    <div key={grupo.organizacion} className="flota-grupo">
                      <h2 className="flota-grupo-titulo">
                        {grupo.organizacion}
                        <span>{grupo.filas.length}</span>
                      </h2>
                      <ul className="flota-lista">
                        {grupo.filas.map((fila) => {
                          const activa = fila.galpon.id === seleccionada?.galpon.id
                          const numSensores = sensoresPorGalpon.get(fila.galpon.id) ?? 0
                          const equipoTexto = fila.controladores.length === 0
                            ? 'Sin controlador'
                            : `${fila.controladores.length} ESP32 · ${numSensores} ${numSensores === 1 ? 'sensor' : 'sensores'}`

                          return (
                            <li
                              key={fila.galpon.id}
                              className={`flota-item${activa ? ' is-seleccionada' : ''}`}
                              role="option"
                              aria-selected={activa}
                            >
                              <button
                                type="button"
                                className={`flota-tarjeta flota-tarjeta--${fila.estado}`}
                                onClick={() => seleccionar(fila.galpon.id, true)}
                              >
                                <span className={`flota-avatar flota-avatar--${fila.estado}`} aria-hidden="true">
                                  <IcChip size={18} />
                                </span>

                                <span className="flota-tarjeta-info">
                                  <strong className="flota-tarjeta-nombre">{fila.galpon.nombre}</strong>
                                  <span className="flota-tarjeta-meta">
                                    <span>{fila.granja}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{equipoTexto}</span>
                                  </span>
                                </span>

                                <span className="flota-tarjeta-lado">
                                  <span className={`flota-estado flota-estado--${fila.estado}`}>
                                    <span className="flota-estado-punto" aria-hidden="true" />
                                    {ETIQUETA[fila.estado]}
                                  </span>
                                  <IcChevronRight size={15} className="flota-tarjeta-flecha" aria-hidden="true" />
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <DetalleGalpon
              fila={seleccionada}
              sensores={seleccionada ? sensoresPorGalpon.get(seleccionada.galpon.id) ?? 0 : 0}
              versionPublicada={publicada}
              cargando={cargando}
              abiertoMovil={panelMovilAbierto && seleccionada !== null}
              onCerrarMovil={() => setPanelMovilAbierto(false)}
              onCambio={() => recargar(true)}
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
