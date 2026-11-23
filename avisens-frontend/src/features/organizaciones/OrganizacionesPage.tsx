import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcBuilding,
  IcCheck,
  IcChevronDown,
  IcChevronRight,
  IcClose,
  IcEdit,
  IcPlay,
  IcPointer,
  IcSearch,
  IcSidebar,
  IcStop,
  IcTrash,
  IcUsers,
} from '@shared/ui/icons/icons'
import type { Organizacion } from './api/organizaciones'
import EliminarOrganizacion from './components/EliminarOrganizacion'
import FormularioOrganizacion from './components/FormularioOrganizacion'
import NumeroAnimado from './components/NumeroAnimado'
import { useOrganizaciones } from './hooks/useOrganizaciones'
import {
  actividadDe,
  DIAS_SIN_ACTIVIDAD,
  etiquetaPlan,
  fechaCorta,
  filtrarOrganizaciones,
  inicialesOrganizacion,
  normalizarPlan,
  resumirOrganizaciones,
  siguienteSeleccion,
  type FiltroEstado,
  type OrdenOrganizaciones,
} from './model/organizacion'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './OrganizacionesPage.css'

const ORDENES: Array<{ valor: OrdenOrganizaciones; etiqueta: string }> = [
  { valor: 'nombre-asc', etiqueta: 'Nombre A–Z' },
  { valor: 'nombre-desc', etiqueta: 'Nombre Z–A' },
  { valor: 'granjas', etiqueta: 'Más granjas' },
  { valor: 'personas', etiqueta: 'Más personas' },
  { valor: 'recientes', etiqueta: 'Más recientes' },
]

const ETIQUETA_FILTRO: Record<FiltroEstado, string> = {
  todas: 'Todos',
  activas: 'Activos',
  'sin-actividad': `Sin actividad (+${DIAS_SIN_ACTIVIDAD}d)`,
  suspendidas: 'Suspendidos',
}

const TONOS_AVATAR = ['verde', 'profundo', 'amarillo', 'crema'] as const

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`
}

function EstadoChip({ activa }: { activa: boolean }) {
  return (
    <span className={`org-lista-estado${activa ? ' is-activa' : ''}`}>
      <span className="org-lista-estado-punto" aria-hidden="true" />
      {activa ? 'Activa' : 'Suspendida'}
    </span>
  )
}

function IndicadorFiltro({
  valor,
  label,
  nota,
  activo,
  tono = 'primario',
  icono,
  orden,
  onClick,
}: {
  valor: number | null
  label: string
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
          <span className="adm-kpi-etiqueta">{label}</span>
          <span className="adm-kpi-icono" aria-hidden="true">{icono}</span>
        </span>
        <strong className="adm-kpi-valor">
          {valor === null ? <span className="org-lista-indicador-esqueleto org-brilla" aria-hidden="true" /> : <NumeroAnimado valor={valor} retrasoMs={orden * 60} />}
        </strong>
        <span className="adm-kpi-nota">{nota}</span>
      </button>
    </li>
  )
}

function OrganizacionesPage() {
  const navigate = useNavigate()
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const { organizaciones, cargando, error, recargar, guardar, alternar } = useOrganizaciones()
  useRefetchOnFocus(recargar)
  const [parametros, setParametros] = useSearchParams()
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todas')
  const [orden, setOrden] = useState<OrdenOrganizaciones>('nombre-asc')
  const [aEliminar, setAEliminar] = useState<Organizacion | null>(null)
  const [formulario, setFormulario] = useState<{ abierto: boolean; editando: Organizacion | null }>({ abierto: false, editando: null })
  const buscadorRef = useRef<HTMLInputElement>(null)

  const resumen = useMemo(() => resumirOrganizaciones(organizaciones), [organizaciones])
  const visibles = useMemo(
    () => filtrarOrganizaciones(organizaciones, { texto, estado, orden }),
    [organizaciones, texto, estado, orden],
  )
  const planesConocidos = useMemo(() => {
    const vistos = new Map<string, string>()
    organizaciones.forEach((item) => {
      const clave = normalizarPlan(item.plan)
      if (clave && !vistos.has(clave)) vistos.set(clave, item.plan.trim())
    })
    return [...vistos.values()].sort()
  }, [organizaciones])

  const idPedido = Number(parametros.get('seleccion'))
  const seleccionada = visibles.find((item) => item.id === idPedido) ?? visibles[0] ?? null
  const suspendidas = resumen.total - resumen.activas
  const listo = !cargando && !error
  const hayFiltros = texto.trim() !== '' || estado !== 'todas'
  const actividadSeleccionada = seleccionada ? actividadDe(seleccionada) : null

  function seleccionar(id: number) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('seleccion', String(id))
      return siguientes
    }, { replace: true })
  }

  function elegirFiltro(siguiente: FiltroEstado) {
    setEstado((actual) => (actual === siguiente && siguiente !== 'todas' ? 'todas' : siguiente))
  }

  function limpiarFiltros() {
    setTexto('')
    setEstado('todas')
  }

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      const editando = evento.target instanceof HTMLElement
        && (evento.target.matches('input, textarea, select') || evento.target.isContentEditable)

      if (evento.key === '/' && !editando) {
        evento.preventDefault()
        buscadorRef.current?.focus()
        buscadorRef.current?.select()
        return
      }

      if (editando || visibles.length === 0) return

      const siguienteId = siguienteSeleccion(
        visibles.map((item) => item.id),
        seleccionada?.id ?? null,
        evento.key,
      )
      if (siguienteId !== null) {
        evento.preventDefault()
        setParametros((actuales) => {
          const siguientes = new URLSearchParams(actuales)
          siguientes.set('seleccion', String(siguienteId))
          return siguientes
        }, { replace: true })
        return
      }

      if (evento.key === 'Enter' && seleccionada && !(evento.target instanceof HTMLElement && evento.target.matches('button, a'))) {
        evento.preventDefault()
        navigate(`/organizaciones/${seleccionada.id}`)
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [visibles, seleccionada, navigate, setParametros])

  async function alternarEstado(organizacion: Organizacion) {
    if (organizacion.activa && !(await confirmarAccion({
      titulo: '¿Suspender este cliente?',
      entidad: organizacion.nombre,
      descripcion: 'Sus usuarios dejarán de poder entrar. La información se conserva.',
      textoConfirmar: 'Suspender cliente',
      tono: 'aviso',
    }))) return
    void alternar(organizacion)
  }

  return (
    <div className="page-container adm-page org-lista">
      <header className="org-lista-cabecera org-aparece">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Clientes
          </span>
          <h1 className="org-lista-titulo">Clientes</h1>
          <p className="org-lista-subtitulo">Empresas activas en Avisens. Cada cliente nace al convertir un prospecto.</p>
        </div>
      </header>

      <ul className="adm-kpis" aria-label="Filtrar clientes por estado">
        <IndicadorFiltro
          orden={1}
          valor={listo ? resumen.total : null}
          label="Todos"
          nota={listo ? `${plural(resumen.granjas, 'granja', 'granjas')} · ${plural(resumen.usuarios, 'persona', 'personas')}` : 'Cargando…'}
          activo={estado === 'todas'}
          tono="primario"
          icono={<IcBuilding size={15} />}
          onClick={() => elegirFiltro('todas')}
        />
        <IndicadorFiltro
          orden={2}
          valor={listo ? resumen.activas : null}
          label="Activos"
          nota="Operando en plataforma"
          activo={estado === 'activas'}
          tono="ok"
          icono={<IcCheck size={15} />}
          onClick={() => elegirFiltro('activas')}
        />
        <IndicadorFiltro
          orden={3}
          valor={listo ? resumen.sinActividad : null}
          label="Sin actividad"
          nota={`Más de ${DIAS_SIN_ACTIVIDAD} días sin ingreso`}
          activo={estado === 'sin-actividad'}
          tono={listo && resumen.sinActividad > 0 ? 'alerta' : 'ok'}
          icono={listo && resumen.sinActividad > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
          onClick={() => elegirFiltro('sin-actividad')}
        />
        <IndicadorFiltro
          orden={4}
          valor={listo ? suspendidas : null}
          label="Suspendidos"
          nota={suspendidas === 0 ? 'Ninguno pausado' : 'Acceso pausado'}
          activo={estado === 'suspendidas'}
          tono={suspendidas > 0 ? 'peligro' : 'info'}
          icono={<IcStop size={15} />}
          onClick={() => elegirFiltro('suspendidas')}
        />
      </ul>

      {(cargando || organizaciones.length > 0) && (
        <div className="org-lista-herramientas org-aparece" style={{ '--orden': 3 } as CSSProperties}>
          <label className="org-lista-buscador">
            <span className="sr-only">Buscar cliente</span>
            <IcSearch size={18} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Buscar cliente por nombre o NIT…"
              autoComplete="off"
              aria-keyshortcuts="/"
            />
            {texto ? (
              <button
                type="button"
                className="org-lista-limpiar-busqueda"
                onClick={() => { setTexto(''); buscadorRef.current?.focus() }}
                aria-label="Limpiar búsqueda"
              >
                <IcClose size={14} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>

          {estado !== 'todas' && (
            <button
              type="button"
              className="org-lista-filtro-activo"
              onClick={() => setEstado('todas')}
            >
              <span>{ETIQUETA_FILTRO[estado]}</span>
              <IcClose size={13} aria-hidden="true" />
            </button>
          )}

          <label className="org-lista-orden">
            <span className="org-lista-orden-texto">Ordenar por</span>
            <span className="org-lista-desplegable">
              <select value={orden} onChange={(evento) => setOrden(evento.target.value as OrdenOrganizaciones)}>
                {ORDENES.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
              </select>
              <IcChevronDown size={18} aria-hidden="true" />
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      <div className="org-lista-cuerpo">
        <section className="org-lista-columna" aria-labelledby="org-lista-tus">
          <div className="org-lista-columna-cabecera">
            <h2 id="org-lista-tus">Directorio de clientes</h2>
            {listo && <span role="status">{plural(visibles.length, 'resultado', 'resultados')}</span>}
          </div>

          {cargando ? (
            <ul className="org-lista-tarjetas" aria-hidden="true">
              {[0, 1, 2].map((indice) => <li key={indice} className="org-lista-tarjeta-esqueleto org-brilla" />)}
            </ul>
          ) : error ? null : organizaciones.length === 0 ? (
            <div className="org-lista-vacio">
              <IcBuilding size={28} aria-hidden="true" />
              <h3>Todavía no hay clientes</h3>
              <p>Cada empresa cliente nace al convertir un prospecto. Ve a Prospectos para dar de alta el primero.</p>
              <Link to="/crm" className="adm-btn adm-btn--primario">
                Ir a prospectos <IcArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : visibles.length === 0 ? (
            <div className="org-lista-vacio">
              <IcSearch size={28} aria-hidden="true" />
              <h3>Sin coincidencias</h3>
              <p>Ningún cliente coincide con la búsqueda o el filtro activo.</p>
              {hayFiltros && <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button>}
            </div>
          ) : (
            <ul className="org-lista-tarjetas" role="listbox" aria-labelledby="org-lista-tus">
              {visibles.map((organizacion, indice) => {
                const activa = organizacion.id === seleccionada?.id
                const actividad = actividadDe(organizacion)
                return (
                  <li
                    key={organizacion.id}
                    role="option"
                    aria-selected={activa}
                    className={`org-lista-item org-aparece${activa ? ' is-seleccionada' : ''}${organizacion.activa ? '' : ' is-suspendida'}`}
                    style={{ '--orden': Math.min(indice, 8) + 4 } as CSSProperties}
                  >
                    <div
                      className="org-lista-tarjeta org-lista-tarjeta--compacta"
                      tabIndex={0}
                      onClick={() => {
                        if (window.matchMedia('(max-width: 64rem)').matches) {
                          navigate(`/organizaciones/${organizacion.id}`)
                        } else {
                          seleccionar(organizacion.id)
                        }
                      }}
                      onDoubleClick={() => navigate(`/organizaciones/${organizacion.id}`)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault()
                          if (activa || window.matchMedia('(max-width: 64rem)').matches) {
                            navigate(`/organizaciones/${organizacion.id}`)
                          } else {
                            seleccionar(organizacion.id)
                          }
                        }
                      }}
                    >
                      <span className={`org-lista-avatar org-lista-avatar--${TONOS_AVATAR[organizacion.id % TONOS_AVATAR.length]}`} aria-hidden="true">
                        {inicialesOrganizacion(organizacion.nombre)}
                      </span>
                      <span className="org-lista-tarjeta-info">
                        <span className="org-lista-tarjeta-nombre-fila">
                          <span className="org-lista-tarjeta-nombre">{organizacion.nombre}</span>
                          {organizacion.activa && actividad.tono === 'inactiva' && (
                            <span className="org-lista-alerta-inactiva" title={actividad.texto}>Sin actividad</span>
                          )}
                        </span>
                        <span className="org-lista-tarjeta-meta">
                          <span>Plan {etiquetaPlan(organizacion.plan)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{organizacion.nit ? `NIT ${organizacion.nit}` : 'Sin NIT'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{plural(organizacion._count.granjas, 'granja', 'granjas')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{plural(organizacion._count.usuarios, 'persona', 'personas')}</span>
                        </span>
                      </span>
                      <span className="org-lista-tarjeta-derecha">
                        <EstadoChip activa={organizacion.activa} />
                        <IcChevronRight size={16} className="org-lista-tarjeta-chevron" aria-hidden="true" />
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {listo && visibles.length > 0 && (
            <p className="org-lista-pista">
              <kbd>/</kbd> buscar · <kbd>↑</kbd><kbd>↓</kbd> recorrer · <kbd>Enter</kbd> abrir ficha
            </p>
          )}
        </section>

        <aside className="org-lista-panel" aria-label="Resumen del cliente seleccionado">
          <div className="org-lista-panel-cabecera">
            <IcSidebar size={16} aria-hidden="true" />
            <span>Resumen del cliente</span>
          </div>
          {seleccionada && actividadSeleccionada ? (
            <div className="org-lista-panel-cuerpo" key={seleccionada.id} aria-live="polite">
              <div className="org-lista-panel-top">
                <EstadoChip activa={seleccionada.activa} />
                <span className="org-lista-panel-plan">Plan {etiquetaPlan(seleccionada.plan)}</span>
              </div>
              <h2 className="org-lista-panel-nombre">{seleccionada.nombre}</h2>

              <div className={`org-lista-salud org-lista-salud--${actividadSeleccionada.tono}`}>
                <span className="org-lista-salud-punto" aria-hidden="true" />
                <span>{actividadSeleccionada.texto}</span>
              </div>

              <dl className="org-lista-panel-meta">
                <div>
                  <dt>NIT</dt>
                  <dd>{seleccionada.nit ?? 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt>Cliente desde</dt>
                  <dd>{fechaCorta(seleccionada.fecha_creacion)}</dd>
                </div>
              </dl>

              <h3 className="org-lista-panel-subtitulo">Estructura activa</h3>
              <ul className="org-lista-panel-recursos">
                <li>
                  <span className="org-lista-panel-icono" aria-hidden="true"><IcBarn size={18} /></span>
                  <span><strong>Granjas</strong><small>Operación avícola</small></span>
                  <b><NumeroAnimado valor={seleccionada._count.granjas} /></b>
                </li>
                <li>
                  <span className="org-lista-panel-icono" aria-hidden="true"><IcUsers size={18} /></span>
                  <span><strong>Personas</strong><small>Propietarios y operarios</small></span>
                  <b><NumeroAnimado valor={seleccionada._count.usuarios} /></b>
                </li>
              </ul>

              <Link className="org-lista-acceder" to={`/organizaciones/${seleccionada.id}`}>
                Abrir ficha completa <IcArrowRight size={18} aria-hidden="true" />
              </Link>

              {puedeGestionar && (
                <div className="org-lista-panel-acciones">
                  <div className="org-lista-panel-gestion">
                    <button type="button" onClick={() => setFormulario({ abierto: true, editando: seleccionada })}>
                      <IcEdit size={14} aria-hidden="true" /> Editar datos
                    </button>
                    <button
                      type="button"
                      className={seleccionada.activa ? 'is-peligro' : ''}
                      onClick={() => alternarEstado(seleccionada)}
                    >
                      {seleccionada.activa ? <IcStop size={14} aria-hidden="true" /> : <IcPlay size={14} aria-hidden="true" />}
                      {seleccionada.activa ? 'Suspender' : 'Reactivar'}
                    </button>
                  </div>
                  <button type="button" className="org-lista-panel-eliminar" onClick={() => setAEliminar(seleccionada)}>
                    <IcTrash size={14} aria-hidden="true" /> Eliminar cliente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="org-lista-panel-cuerpo org-lista-panel-cuerpo--vacio">
              <IcPointer size={24} aria-hidden="true" />
              <p>{cargando ? 'Cargando clientes…' : 'Elige un cliente del directorio para ver su resumen.'}</p>
            </div>
          )}
        </aside>
      </div>

      {aEliminar && (
        <EliminarOrganizacion
          organizacionId={aEliminar.id}
          nombre={aEliminar.nombre}
          onCerrar={() => setAEliminar(null)}
          onEliminada={() => {
            setAEliminar(null)
            setParametros((actuales) => {
              const siguientes = new URLSearchParams(actuales)
              siguientes.delete('seleccion')
              return siguientes
            }, { replace: true })
            void recargar(true)
          }}
        />
      )}

      {formulario.abierto && (
        <FormularioOrganizacion
          editando={formulario.editando}
          planesConocidos={planesConocidos}
          onGuardar={guardar}
          onCerrar={() => setFormulario({ abierto: false, editando: null })}
        />
      )}
    </div>
  )
}

export default OrganizacionesPage
