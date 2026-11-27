import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import { IcAlert, IcChat, IcCheck, IcChevronDown, IcChevronRight, IcClose, IcSearch, IcUserCircle } from '@shared/ui/icons/icons'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import PanelSolicitudPqrs from './components/PanelSolicitudPqrs'
import { useSolicitudesPqrs } from './hooks/useSolicitudesPqrs'
import {
  duracion,
  grupoDe,
  organizarBandeja,
  plazoDe,
  resumirBandeja,
  siguienteSolicitudId,
  type VistaPqrs,
} from './model/bandejaPqrs'
import { CATEGORIAS_PQRS, ETIQUETAS_ESTADO, type SolicitudPqrs } from './model/solicitudPqrs'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './SolicitudesPqrsPage.css'

function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

function IndicadorFiltro({ etiqueta, valor, nota, activo, tono = 'primario', icono, orden, onClick }: {
  etiqueta: string
  valor: string | number | null
  nota: string
  activo: boolean
  tono?: 'primario' | 'ok' | 'info' | 'alerta' | 'peligro'
  icono: ReactNode
  orden: number
  onClick: () => void
}) {
  return (
    <li className="org-aparece" style={{ '--orden': orden } as CSSProperties}>
      <button
        type="button"
        className={`adm-kpi adm-kpi--${tono}${activo ? ' is-activo' : ''}`}
        aria-pressed={activo}
        onClick={onClick}
      >
        <span className="adm-kpi-cab">
          <span className="adm-kpi-etiqueta">{etiqueta}</span>
          <span className="adm-kpi-icono" aria-hidden="true">{icono}</span>
        </span>
        <strong className="adm-kpi-valor">
          {valor === null ? <span className="sop-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
        </strong>
        <span className="adm-kpi-nota">{nota}</span>
      </button>
    </li>
  )
}

function TarjetaSolicitud({ solicitud, seleccionada, ahora, onSeleccionar }: {
  solicitud: SolicitudPqrs
  seleccionada: boolean
  ahora: Date
  onSeleccionar: () => void
}) {
  const plazo = plazoDe(solicitud, ahora)
  const grupo = grupoDe(solicitud, ahora)
  const contacto = solicitud.prospecto.nombre || solicitud.prospecto.telefono || solicitud.prospecto.email || 'Sin contacto'
  const categoriaClase = solicitud.categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  return (
    <li
      className={`sop-item${seleccionada ? ' is-seleccionada' : ''}`}
      role="option"
      aria-selected={seleccionada}
    >
      <button
        type="button"
        className={`sop-tarjeta sop-tarjeta--${grupo}`}
        onClick={onSeleccionar}
      >
        <span className="sop-tarjeta-info">
          <span className="sop-tarjeta-linea">
            <span className="sop-radicado">{solicitud.radicado}</span>
            <span className={`sop-categoria sop-categoria--${categoriaClase}`}>{solicitud.categoria}</span>
          </span>
          <span className="sop-tarjeta-asunto">{solicitud.asunto || 'Sin asunto'}</span>
          <span className="sop-tarjeta-contacto">{contacto}</span>
        </span>
        <span className={`sop-plazo sop-plazo--${plazo.tono}`}>{plazo.texto}</span>
        <span className="sop-responsable" title={solicitud.responsable?.nombre_completo ?? 'Sin responsable'}>
          {solicitud.responsable
            ? <span className="sop-responsable-avatar" aria-hidden="true">{iniciales(solicitud.responsable.nombre_completo)}</span>
            : <span className="sop-responsable-vacio">Sin tomar</span>}
          <IcChevronRight size={15} className="sop-tarjeta-flecha" aria-hidden="true" />
          <span className="sr-only">{solicitud.responsable ? `A cargo de ${solicitud.responsable.nombre_completo}` : 'Sin responsable'} · {ETIQUETAS_ESTADO[solicitud.estado]}</span>
        </span>
      </button>
    </li>
  )
}

function SolicitudesPqrsPage() {
  const { solicitudes, cargando, error, ocupadaId, recargar, tomar, responder } = useSolicitudesPqrs()
  const usuarioId = getUsuario()?.id ?? null
  const [parametros, setParametros] = useSearchParams()
  const [vista, setVista] = useState<VistaPqrs>('atender')
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false)
  const [ahora, setAhora] = useState(() => new Date())
  const buscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(reloj)
  }, [])

  useEffect(() => {
    function atajoBuscar(evento: globalThis.KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement) return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', atajoBuscar)
    return () => window.removeEventListener('keydown', atajoBuscar)
  }, [])

  const resumen = useMemo(() => resumirBandeja(solicitudes, usuarioId, ahora), [solicitudes, usuarioId, ahora])
  const secciones = useMemo(
    () => organizarBandeja(solicitudes, { vista, texto, categoria, usuarioId, soloVencidas }, ahora),
    [solicitudes, vista, texto, categoria, usuarioId, soloVencidas, ahora],
  )
  const items = useMemo(() => secciones.flatMap((seccion) => seccion.items), [secciones])
  const idsVisibles = useMemo(() => items.map((item) => item.id), [items])
  const idPedido = Number(parametros.get('solicitud'))
  const seleccionada = items.find((solicitud) => solicitud.id === idPedido)
    ?? solicitudes.find((solicitud) => solicitud.id === idPedido)
    ?? items[0]
    ?? null
  const listo = !cargando && !error
  const hayFiltros = texto.trim() !== '' || categoria !== 'todas' || soloVencidas || vista === 'todas'

  const notaResueltas = useMemo(() => {
    if (!listo) return 'Calculando…'
    const partes: string[] = []
    if (resumen.aTiempoPct !== null) partes.push(`${resumen.aTiempoPct}% a tiempo`)
    if (resumen.respuestaPromedioHoras !== null) partes.push(`prom. ${duracion(resumen.respuestaPromedioHoras * 3_600_000)}`)
    return partes.length > 0 ? partes.join(' · ') : `${resumen.resueltasSemana} en últimos 7 días`
  }, [listo, resumen])

  function seleccionar(id: number, abrirEnMovil = false) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('solicitud', String(id))
      return siguientes
    }, { replace: true })
    if (abrirEnMovil && window.matchMedia('(max-width: 64rem)').matches) {
      setPanelMovilAbierto(true)
    }
  }

  function elegirVista(nuevaVista: VistaPqrs, vencidas = false) {
    setVista(nuevaVista)
    setSoloVencidas(vencidas)
  }

  function limpiarFiltros() {
    setTexto('')
    setCategoria('todas')
    setSoloVencidas(false)
    if (vista === 'todas') setVista('atender')
  }

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguienteId = siguienteSolicitudId(idsVisibles, seleccionada?.id ?? null, evento.key)
    if (siguienteId === null) return
    evento.preventDefault()
    seleccionar(siguienteId, false)
  }

  return (
    <div className="page-container adm-page sop">
      <header className="sop-cabecera org-aparece">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Soporte
          </span>
          <h1 className="sop-titulo">Solicitudes PQRS</h1>
          <p className="sop-subtitulo">Peticiones, quejas y reclamos de los clientes. Atiende primero lo que está por vencer.</p>
        </div>
      </header>

      <ul className="adm-kpis" aria-label="Filtros rápidos de soporte">
        <IndicadorFiltro
          orden={1}
          etiqueta="Por atender"
          valor={listo ? resumen.porAtender : null}
          nota={!listo ? 'Calculando…' : resumen.sinTomar === 1 ? '1 sin tomar' : `${resumen.sinTomar} sin tomar`}
          activo={vista === 'atender' && !soloVencidas}
          tono="primario"
          icono={<IcChat size={15} />}
          onClick={() => elegirVista('atender', false)}
        />
        <IndicadorFiltro
          orden={2}
          etiqueta="Vencidas"
          valor={listo ? resumen.vencidas : null}
          nota={!listo ? 'Calculando…' : resumen.porVencer ? `${resumen.porVencer} por vencer` : 'Nada por vencer'}
          activo={vista === 'atender' && soloVencidas}
          tono={resumen.vencidas > 0 ? 'peligro' : 'ok'}
          icono={resumen.vencidas > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
          onClick={() => elegirVista('atender', !soloVencidas)}
        />
        <IndicadorFiltro
          orden={3}
          etiqueta="Mías"
          valor={listo ? resumen.porVista.mias : null}
          nota="Casos a tu cargo"
          activo={vista === 'mias'}
          tono="info"
          icono={<IcUserCircle size={15} />}
          onClick={() => elegirVista('mias', false)}
        />
        <IndicadorFiltro
          orden={4}
          etiqueta="Resueltas"
          valor={listo ? resumen.porVista.resueltas : null}
          nota={notaResueltas}
          activo={vista === 'resueltas'}
          tono="ok"
          icono={<IcCheck size={15} />}
          onClick={() => elegirVista('resueltas', false)}
        />
      </ul>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      {!cargando && solicitudes.length > 0 && (
        <div className="sop-herramientas org-aparece" style={{ '--orden': 2 } as CSSProperties}>
          <label className="sop-buscador">
            <span className="sr-only">Buscar solicitud</span>
            <IcSearch size={16} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Buscar por radicado, cliente o asunto…"
              autoComplete="off"
            />
            {texto ? (
              <button
                type="button"
                className="sop-limpiar-busqueda"
                onClick={() => setTexto('')}
                aria-label="Limpiar búsqueda"
              >
                <IcClose size={13} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>

          <div className="sop-controles">
            <label className="sop-desplegable">
              <span className="sr-only">Filtrar por categoría</span>
              <select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
                <option value="todas">Categoría: todas</option>
                {CATEGORIAS_PQRS.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select>
              <IcChevronDown size={16} aria-hidden="true" />
            </label>

            <button
              type="button"
              className={`sop-todas-pill${vista === 'todas' ? ' is-activo' : ''}`}
              aria-pressed={vista === 'todas'}
              onClick={() => elegirVista(vista === 'todas' ? 'atender' : 'todas', false)}
            >
              Todas
              <span>{resumen.porVista.todas}</span>
            </button>

            {hayFiltros && (
              <button type="button" className="sop-filtro-limpiar" onClick={limpiarFiltros}>
                Limpiar <IcClose size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="sop-cuerpo">
        <div className="sop-bandeja">
          {cargando ? (
            <ul className="sop-lista" aria-hidden="true">
              {[0, 1, 2, 3].map((indice) => <li key={indice} className="sop-tarjeta-esqueleto org-brilla" />)}
            </ul>
          ) : error ? null : solicitudes.length === 0 ? (
            <EstadoVacio
              className="sop-vacio"
              titulo="Todavía no hay solicitudes"
              texto="Cuando un cliente radique una petición, queja o reclamo por el chatbot, aparecerá aquí con su plazo."
            />
          ) : secciones.length === 0 ? (
            <EstadoVacio
              className="sop-vacio"
              titulo={hayFiltros ? 'Sin coincidencias' : vista === 'atender' ? 'Bandeja al día' : 'Nada por aquí'}
              texto={hayFiltros ? 'Ninguna solicitud coincide con la búsqueda o los filtros.' : vista === 'atender' ? 'No hay solicitudes pendientes.' : 'Esta vista no tiene solicitudes todavía.'}
              accion={hayFiltros ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button> : undefined}
            />
          ) : (
            <div
              role="listbox"
              aria-label="Solicitudes PQRS"
              tabIndex={0}
              className="sop-listbox"
              onKeyDown={manejarTecladoLista}
            >
              {secciones.map((seccion) => (
                <section key={seccion.grupo} className={`sop-seccion sop-seccion--${seccion.grupo}`} aria-labelledby={`sop-grupo-${seccion.grupo}`}>
                  <header>
                    <h2 id={`sop-grupo-${seccion.grupo}`}>{seccion.titulo}<span>{seccion.items.length}</span></h2>
                    <p>{seccion.descripcion}</p>
                  </header>
                  <ul className="sop-lista">
                    {seccion.items.map((solicitud) => (
                      <TarjetaSolicitud
                        key={solicitud.id}
                        solicitud={solicitud}
                        ahora={ahora}
                        seleccionada={solicitud.id === seleccionada?.id}
                        onSeleccionar={() => seleccionar(solicitud.id, true)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {listo && solicitudes.length > 0 && (
          <PanelSolicitudPqrs
            key={seleccionada?.id ?? 'vacio'}
            solicitud={seleccionada}
            ahora={ahora}
            ocupada={ocupadaId !== null && ocupadaId === seleccionada?.id}
            abiertoMovil={panelMovilAbierto && seleccionada !== null}
            onCerrarMovil={() => setPanelMovilAbierto(false)}
            onTomar={tomar}
            onResponder={responder}
          />
        )}
      </div>
    </div>
  )
}

export default SolicitudesPqrsPage
