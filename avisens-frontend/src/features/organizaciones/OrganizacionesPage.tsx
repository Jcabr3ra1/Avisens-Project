import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import {
  IcArrowRight,
  IcBarn,
  IcBuilding,
  IcCheck,
  IcChevronDown,
  IcChevronRight,
  Icon,
  IcPointer,
  IcSearch,
  IcSidebar,
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
  type FiltroEstado,
  type OrdenOrganizaciones,
} from './model/organizacion'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './OrganizacionesPage.css'

const ESTADOS: Array<{ valor: FiltroEstado; etiqueta: string }> = [
  { valor: 'todas', etiqueta: 'Estado: todas' },
  { valor: 'activas', etiqueta: 'Estado: activas' },
  { valor: 'suspendidas', etiqueta: 'Estado: suspendidas' },
]

const ORDENES: Array<{ valor: OrdenOrganizaciones; etiqueta: string }> = [
  { valor: 'nombre-asc', etiqueta: 'Nombre A–Z' },
  { valor: 'nombre-desc', etiqueta: 'Nombre Z–A' },
  { valor: 'granjas', etiqueta: 'Más granjas' },
  { valor: 'personas', etiqueta: 'Más personas' },
  { valor: 'recientes', etiqueta: 'Más recientes' },
]

const TONOS_AVATAR = ['verde', 'profundo', 'amarillo', 'crema'] as const

function Visto({ size }: { size: number }) {
  return <Icon size={size} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
}

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

function Indicador({ valor, label, nota, orden }: {
  valor: number | null
  label: string
  nota: string
  icono?: ReactNode
  orden: number
}) {
  return (
    <li className="org-lista-indicador org-aparece" style={{ '--orden': orden } as CSSProperties}>
      <span className="org-lista-indicador-label">{label}</span>
      <strong className="org-lista-indicador-valor">
        {valor === null ? <span className="org-lista-indicador-esqueleto org-brilla" aria-hidden="true" /> : <NumeroAnimado valor={valor} retrasoMs={orden * 60} />}
      </strong>
      <span className="org-lista-indicador-nota">{nota}</span>
    </li>
  )
}

function OrganizacionesPage() {
  const navigate = useNavigate()
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const { organizaciones, cargando, error, recargar, guardar, alternar } = useOrganizaciones()
  const [parametros, setParametros] = useSearchParams()
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todas')
  const [orden, setOrden] = useState<OrdenOrganizaciones>('nombre-asc')
  const [aEliminar, setAEliminar] = useState<Organizacion | null>(null)
  const [formulario, setFormulario] = useState<{ abierto: boolean; editando: Organizacion | null }>({ abierto: false, editando: null })
  const buscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const editando = evento.target instanceof HTMLElement
        && (evento.target.matches('input, textarea, select') || evento.target.isContentEditable)
      if (evento.key === '/' && !evento.metaKey && !evento.ctrlKey && !evento.altKey && !editando && !document.querySelector('[role="dialog"]')) {
        evento.preventDefault()
        buscadorRef.current?.focus()
        buscadorRef.current?.select()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [])

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

  function seleccionar(id: number) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('seleccion', String(id))
      return siguientes
    }, { replace: true })
  }

  function limpiarFiltros() {
    setTexto('')
    setEstado('todas')
  }

  function alternarEstado(organizacion: Organizacion) {
    if (organizacion.activa && !window.confirm(
      `¿Suspender a ${organizacion.nombre}? Sus usuarios dejarán de poder entrar, pero no se borra nada.`,
    )) return
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
          <h1 className="org-lista-titulo">Organizaciones</h1>
          <p className="org-lista-subtitulo">Los clientes de Avisens. Cada una nace al convertir un prospecto.</p>
        </div>
      </header>

      <ul className="org-lista-indicadores" aria-label="Resumen de organizaciones">
        <Indicador orden={1} valor={listo ? resumen.total : null} label="Organizaciones" nota="Disponibles para acceder" icono={<IcBuilding size={18} />} />
        <Indicador
          orden={2}
          valor={listo ? resumen.activas : null}
          label="Activas"
          nota={!listo ? 'Calculando…' : resumen.sinActividad > 0 ? `${resumen.sinActividad} sin actividad en ${DIAS_SIN_ACTIVIDAD} días` : suspendidas === 0 ? 'Todas operativas' : `${plural(suspendidas, 'suspendida', 'suspendidas')}`}
          icono={<IcCheck size={18} />}
        />
        <Indicador orden={3} valor={listo ? resumen.granjas : null} label="Granjas en total" nota="Entre tus organizaciones" icono={<IcBarn size={18} />} />
        <Indicador orden={4} valor={listo ? resumen.usuarios : null} label="Personas en total" nota="Entre tus organizaciones" icono={<IcUsers size={18} />} />
      </ul>

      {(cargando || organizaciones.length > 0) && (
        <div className="org-lista-herramientas org-aparece" style={{ '--orden': 3 } as CSSProperties}>
          <label className="org-lista-buscador">
            <span className="sr-only">Buscar organización</span>
            <IcSearch size={18} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Buscar organización por nombre o NIT…"
              autoComplete="off"
              aria-keyshortcuts="/"
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <label className="org-lista-desplegable">
            <span className="sr-only">Filtrar por estado</span>
            <select value={estado} onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}>
              {ESTADOS.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
            </select>
            <IcChevronDown size={18} aria-hidden="true" />
          </label>
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
            <h2 id="org-lista-tus">Tus organizaciones</h2>
            {listo && <span role="status">{plural(visibles.length, 'resultado', 'resultados')}</span>}
          </div>

          {cargando ? (
            <ul className="org-lista-tarjetas" aria-hidden="true">
              {[0, 1, 2].map((indice) => <li key={indice} className="org-lista-tarjeta-esqueleto org-brilla" />)}
            </ul>
          ) : error ? null : organizaciones.length === 0 ? (
            <div className="org-lista-vacio">
              <IcBuilding size={28} aria-hidden="true" />
              <h3>Todavía no hay organizaciones</h3>
              <p>Cada empresa cliente es una organización. Se crea sola al convertir un prospecto en cliente.</p>
            </div>
          ) : visibles.length === 0 ? (
            <div className="org-lista-vacio">
              <IcSearch size={28} aria-hidden="true" />
              <h3>Sin coincidencias</h3>
              <p>Ninguna organización coincide con la búsqueda o el estado elegido.</p>
              {hayFiltros && <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button>}
            </div>
          ) : (
            <ul className="org-lista-tarjetas" role="radiogroup" aria-labelledby="org-lista-tus">
              {visibles.map((organizacion, indice) => {
                const activa = organizacion.id === seleccionada?.id
                return (
                  <li
                    key={organizacion.id}
                    className={`org-lista-item org-aparece${activa ? ' is-seleccionada' : ''}`}
                    style={{ '--orden': Math.min(indice, 8) + 4 } as CSSProperties}
                  >
                    <label className="org-lista-tarjeta" onDoubleClick={() => navigate(`/organizaciones/${organizacion.id}`)}>
                      <input
                        type="radio"
                        name="organizacion"
                        className="sr-only"
                        checked={activa}
                        onChange={() => seleccionar(organizacion.id)}
                      />
                      <span className={`org-lista-avatar org-lista-avatar--${TONOS_AVATAR[organizacion.id % TONOS_AVATAR.length]}`} aria-hidden="true">
                        {inicialesOrganizacion(organizacion.nombre)}
                      </span>
                      <span className="org-lista-tarjeta-info">
                        <span className="org-lista-tarjeta-nombre">{organizacion.nombre}</span>
                        <span className="org-lista-tarjeta-meta">
                          <span>Plan {etiquetaPlan(organizacion.plan)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{organizacion.nit ? `NIT ${organizacion.nit}` : 'Sin NIT'}</span>
                        </span>
                      </span>
                      <span className="org-lista-tarjeta-derecha">
                        <EstadoChip activa={organizacion.activa} />
                        <span className="org-lista-radio" aria-hidden="true"><Visto size={14} /></span>
                      </span>
                      <span className="org-lista-tarjeta-pie">
                        <span className="org-lista-conteo-item">
                          <IcBarn size={15} aria-hidden="true" />
                          <span>{plural(organizacion._count.granjas, 'granja', 'granjas')}</span>
                        </span>
                        <span className="org-lista-conteo-item">
                          <IcUsers size={15} aria-hidden="true" />
                          <span>{plural(organizacion._count.usuarios, 'persona', 'personas')}</span>
                        </span>
                        <span className={`org-lista-actividad org-lista-actividad--${actividadDe(organizacion).tono}`}>{actividadDe(organizacion).texto}</span>
                        <span className="org-lista-tarjeta-accion" aria-hidden="true">
                          {activa ? <>Seleccionada <Visto size={15} /></> : <>Ver detalle <IcChevronRight size={15} /></>}
                        </span>
                      </span>
                    </label>
                    {activa && (
                      <Link className="org-lista-acceder org-lista-acceder--movil" to={`/organizaciones/${organizacion.id}`}>
                        Acceder a organización <IcArrowRight size={18} aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {listo && visibles.length > 0 && (
            <p className="org-lista-pista">
              <IcPointer size={16} aria-hidden="true" />
              Selecciona una organización para revisar sus recursos antes de acceder.
            </p>
          )}
        </section>

        <aside className="org-lista-panel" aria-label="Organización seleccionada">
          <div className="org-lista-panel-cabecera">
            <IcSidebar size={16} aria-hidden="true" />
            <span>Organización seleccionada</span>
          </div>
          {seleccionada ? (
            <div className="org-lista-panel-cuerpo" key={seleccionada.id} aria-live="polite">
              <div className="org-lista-panel-top">
                <EstadoChip activa={seleccionada.activa} />
                <span className="org-lista-panel-plan">Plan {etiquetaPlan(seleccionada.plan)}</span>
              </div>
              <h2 className="org-lista-panel-nombre">{seleccionada.nombre}</h2>
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
              <h3 className="org-lista-panel-subtitulo">En este espacio</h3>
              <ul className="org-lista-panel-recursos">
                <li>
                  <span className="org-lista-panel-icono" aria-hidden="true"><IcBarn size={18} /></span>
                  <span><strong>Granjas</strong><small>Vinculadas a esta organización</small></span>
                  <b><NumeroAnimado valor={seleccionada._count.granjas} /></b>
                </li>
                <li>
                  <span className="org-lista-panel-icono" aria-hidden="true"><IcUsers size={18} /></span>
                  <span><strong>Personas</strong><small>Vinculadas a esta organización</small></span>
                  <b><NumeroAnimado valor={seleccionada._count.usuarios} /></b>
                </li>
              </ul>
              <Link className="org-lista-acceder" to={`/organizaciones/${seleccionada.id}`}>
                Acceder a organización <IcArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className="org-lista-panel-nota">Entrarás al espacio de esta organización.</p>
              {puedeGestionar && (
                <div className="org-lista-panel-gestion">
                  <button type="button" onClick={() => setFormulario({ abierto: true, editando: seleccionada })}>Editar datos</button>
                  <button
                    type="button"
                    className={seleccionada.activa ? 'is-peligro' : ''}
                    onClick={() => alternarEstado(seleccionada)}
                  >
                    {seleccionada.activa ? 'Suspender' : 'Reactivar'}
                  </button>
                  <button type="button" className="is-eliminar" onClick={() => setAEliminar(seleccionada)}>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="org-lista-panel-cuerpo org-lista-panel-cuerpo--vacio">
              <IcPointer size={24} aria-hidden="true" />
              <p>{cargando ? 'Cargando organizaciones…' : 'Elige una organización de la lista para ver sus recursos.'}</p>
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
            void recargar()
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
