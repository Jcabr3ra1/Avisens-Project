import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IcChevronRight, IcClose, IcSearch } from '@shared/ui/icons/icons'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import PanelRecuperacion from './components/PanelRecuperacion'
import { useRecuperacionesPassword } from './hooks/useRecuperacionesPassword'
import {
  filtrarRecuperaciones,
  resumirRecuperaciones,
  siguienteRecuperacionId,
  type FiltroVistaRecuperacion,
} from './model/bandejaRecuperaciones'
import { ETIQUETAS_ESTADO_RECUPERACION } from './model/recuperacionPassword'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './RecuperacionesPassword.css'

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

function fechaCorta(valor: string): string {
  const instante = new Date(valor)
  return Number.isNaN(instante.getTime()) ? '' : FECHA_CORTA.format(instante)
}

function IndicadorFiltro({ etiqueta, valor, nota, activo, tono, orden, onClick }: {
  etiqueta: string
  valor: number | null
  nota: string
  activo: boolean
  tono?: 'aviso'
  orden: number
  onClick: () => void
}) {
  return (
    <li className="rec-indicador org-aparece" style={{ '--orden': orden } as CSSProperties}>
      <button
        type="button"
        className={`rec-indicador-btn${activo ? ' is-activo' : ''}${tono ? ` is-${tono}` : ''}`}
        aria-pressed={activo}
        onClick={onClick}
      >
        <span className="rec-indicador-label">{etiqueta}</span>
        <strong className="rec-indicador-valor">
          {valor === null ? <span className="rec-esqueleto-num org-brilla" aria-hidden="true" /> : valor}
        </strong>
        <span className="rec-indicador-nota">{nota}</span>
      </button>
    </li>
  )
}

function RecuperacionesPasswordPage() {
  const { solicitudes, cargando, error, cargar, aprobar, rechazar } = useRecuperacionesPassword()
  const [parametros, setParametros] = useSearchParams()
  const [vista, setVista] = useState<FiltroVistaRecuperacion>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false)
  const buscadorRef = useRef<HTMLInputElement>(null)

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

  const resumen = useMemo(() => resumirRecuperaciones(solicitudes), [solicitudes])
  const visibles = useMemo(
    () => filtrarRecuperaciones(solicitudes, { vista, busqueda }),
    [solicitudes, vista, busqueda],
  )
  const idsVisibles = useMemo(() => visibles.map((s) => s.id), [visibles])
  const idPedido = Number(parametros.get('solicitud'))
  const seleccionada = visibles.find((s) => s.id === idPedido)
    ?? solicitudes.find((s) => s.id === idPedido)
    ?? visibles[0]
    ?? null
  const listo = !cargando && !error
  const hayFiltros = busqueda.trim() !== '' || vista !== 'todos'

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

  function limpiarFiltros() {
    setBusqueda('')
    setVista('todos')
  }

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguienteId = siguienteRecuperacionId(idsVisibles, seleccionada?.id ?? null, evento.key)
    if (siguienteId === null) return
    evento.preventDefault()
    seleccionar(siguienteId, false)
  }

  return (
    <div className="page-container rec-page adm-page">
      <header className="rec-cabecera org-aparece">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Acceso
          </span>
          <h1 className="rec-titulo">Recuperar acceso</h1>
          <p className="rec-subtitulo">Verifica a la persona y genera una contraseña temporal de un solo uso.</p>
        </div>
      </header>

      <ul className="rec-indicadores" aria-label="Filtros rápidos de recuperaciones">
        <IndicadorFiltro
          orden={1}
          etiqueta="Por revisar"
          valor={listo ? resumen.pendientes : null}
          nota={!listo ? 'Calculando…' : resumen.pendientes ? 'Esperan verificación' : 'Nada pendiente'}
          activo={vista === 'pendiente'}
          tono={resumen.pendientes > 0 ? 'aviso' : undefined}
          onClick={() => setVista(vista === 'pendiente' ? 'todos' : 'pendiente')}
        />
        <IndicadorFiltro
          orden={2}
          etiqueta="Acceso temporal"
          valor={listo ? resumen.aprobadas : null}
          nota="Aún no cambian su clave"
          activo={vista === 'aprobada'}
          onClick={() => setVista(vista === 'aprobada' ? 'todos' : 'aprobada')}
        />
        <IndicadorFiltro
          orden={3}
          etiqueta="Cerradas"
          valor={listo ? resumen.cerradas : null}
          nota="Completadas o rechazadas"
          activo={vista === 'cerradas'}
          onClick={() => setVista(vista === 'cerradas' ? 'todos' : 'cerradas')}
        />
        <IndicadorFiltro
          orden={4}
          etiqueta="Total"
          valor={listo ? resumen.total : null}
          nota="Solicitudes registradas"
          activo={vista === 'todos'}
          onClick={() => setVista('todos')}
        />
      </ul>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void cargar()}>Reintentar</button>
        </div>
      )}

      {!cargando && solicitudes.length > 0 && (
        <div className="rec-herramientas org-aparece" style={{ '--orden': 2 } as CSSProperties}>
          <label className="rec-buscador">
            <span className="sr-only">Buscar solicitud</span>
            <IcSearch size={16} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre, usuario, documento o motivo…"
              autoComplete="off"
            />
            {busqueda ? (
              <button
                type="button"
                className="rec-limpiar-busqueda"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
              >
                <IcClose size={13} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>

          <span className="rec-conteo">{visibles.length} de {solicitudes.length}</span>

          {hayFiltros && (
            <button type="button" className="rec-filtro-limpiar" onClick={limpiarFiltros}>
              Limpiar <IcClose size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="rec-cuerpo">
        <div className="rec-bandeja">
          {cargando ? (
            <ul className="rec-lista" aria-hidden="true">
              {[0, 1, 2, 3].map((indice) => <li key={indice} className="rec-tarjeta-esqueleto org-brilla" />)}
            </ul>
          ) : error ? null : solicitudes.length === 0 ? (
            <EstadoVacio
              className="rec-vacio"
              titulo="No hay solicitudes"
              texto="Cuando un propietario u operario pida recuperar su acceso, aparecerá aquí para verificarlo."
            />
          ) : visibles.length === 0 ? (
            <EstadoVacio
              className="rec-vacio"
              titulo="Sin coincidencias"
              texto="Ninguna solicitud coincide con la búsqueda o el estado."
              accion={<button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button>}
            />
          ) : (
            <div
              role="listbox"
              aria-label="Solicitudes de recuperación de acceso"
              tabIndex={0}
              className="rec-listbox"
              onKeyDown={manejarTecladoLista}
            >
              <ul className="rec-lista">
                {visibles.map((solicitud) => {
                  const esSeleccionada = solicitud.id === seleccionada?.id
                  const detalle = [
                    `@${solicitud.usuario.username}`,
                    solicitud.usuario.cedula,
                    fechaCorta(solicitud.fecha_creacion),
                  ].filter(Boolean).join(' · ')

                  return (
                    <li
                      key={solicitud.id}
                      className={`rec-item${esSeleccionada ? ' is-seleccionada' : ''}`}
                      role="option"
                      aria-selected={esSeleccionada}
                    >
                      <button
                        type="button"
                        className={`rec-tarjeta rec-tarjeta--${solicitud.estado}`}
                        onClick={() => seleccionar(solicitud.id, true)}
                      >
                        <span className="rec-avatar" aria-hidden="true">
                          {iniciales(solicitud.usuario.nombre_completo)}
                        </span>

                        <span className="rec-tarjeta-info">
                          <strong className="rec-tarjeta-nombre">{solicitud.usuario.nombre_completo}</strong>
                          <span className="rec-tarjeta-meta">{detalle}</span>
                        </span>

                        <span className="rec-tarjeta-lado">
                          <span className={`rec-estado rec-estado--${solicitud.estado}`}>
                            {ETIQUETAS_ESTADO_RECUPERACION[solicitud.estado]}
                          </span>
                          <IcChevronRight size={16} className="rec-tarjeta-flecha" aria-hidden="true" />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {listo && solicitudes.length > 0 && (
          <PanelRecuperacion
            key={seleccionada?.id ?? 'vacio'}
            solicitud={seleccionada}
            abiertoMovil={panelMovilAbierto && seleccionada !== null}
            onCerrarMovil={() => setPanelMovilAbierto(false)}
            onAprobar={aprobar}
            onRechazar={rechazar}
          />
        )}
      </div>
    </div>
  )
}

export default RecuperacionesPasswordPage
