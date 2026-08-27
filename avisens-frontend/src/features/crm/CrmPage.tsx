// CrmPage.tsx — Módulo CRM de Prospectos (EP-01 HU-08).
// Kanban con donut de puntaje, semáforo de urgencia, acciones rápidas y hero con métricas.
// Todo contra la API real: los prospectos los captura el chatbot de la portada.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import {
  listarProspectos, obtenerProspecto, asignarAsesor, exportarProspectosCsv, listarUsuarios,
  type Prospecto, type ProspectoDetalle, type Usuario,
} from '@shared/api'
import {
  IcSearch, IcGrid, IcUsers, IcPhone, IcClose, IcPin,
  IcFlame, IcThermo, IcSnowflake, IcCheck, IcClock, IcChat,
} from '@shared/ui/icons/icons'
import './CrmPage.css'

// El chatbot puntúa sobre 16 (ver PUNTAJE_MAXIMO en FloatChat) y clasifica
// caliente/tibio/frío según esos umbrales (ver chatbot.service.ts).
const PUNTAJE_MAXIMO = 16

// Etapa visual del pipeline. La calcula el cliente a partir de dos campos
// reales distintos: `clasificacion` (qué tan calificado quedó el prospecto)
// y `estado` (en qué paso del proceso comercial va, p. ej. "cerrado").
type Etapa = 'caliente' | 'tibio' | 'frio' | 'cerrado' | 'descartado'

function etapaDe(p: Prospecto): Etapa {
  if (p.estado === 'cerrado') return 'cerrado'
  if (p.clasificacion === 'caliente') return 'caliente'
  if (p.clasificacion === 'tibio') return 'tibio'
  if (p.clasificacion === 'frio') return 'frio'
  // pqrs, sin_consentimiento, abandonado, cancelado o sin clasificar todavía
  return 'descartado'
}

// ─── Configuración visual de cada etapa del pipeline ─────────────────────────
const CFG: Record<Etapa, {
  label: string; icon: ReactNode; color: string
  colorLight: string; borderColor: string
}> = {
  caliente:   { label: 'Caliente',   icon: <IcFlame size={13} />,     color: '#ef4444',
    colorLight: 'rgba(239,68,68,0.1)',   borderColor: 'rgba(239,68,68,0.22)'   },
  tibio:      { label: 'Tibio',      icon: <IcThermo size={13} />,    color: '#f59e0b',
    colorLight: 'rgba(245,158,11,0.1)',  borderColor: 'rgba(245,158,11,0.22)'  },
  frio:       { label: 'Frío',       icon: <IcSnowflake size={13} />, color: '#3b82f6',
    colorLight: 'rgba(59,130,246,0.1)',  borderColor: 'rgba(59,130,246,0.22)'  },
  cerrado:    { label: 'Cliente',    icon: <IcCheck size={13} />,     color: '#10b981',
    colorLight: 'rgba(16,185,129,0.1)',  borderColor: 'rgba(16,185,129,0.22)'  },
  descartado: { label: 'Descartado', icon: <IcClose size={13} />,     color: '#94a3b8',
    colorLight: 'rgba(148,163,184,0.1)', borderColor: 'rgba(148,163,184,0.2)'  },
}

const RANGOS_PUNTAJE: Record<Etapa, string> = {
  caliente: '12 – 16 pts', tibio: '7 – 11 pts', frio: '0 – 6 pts',
  cerrado: 'Convertido', descartado: 'Sin calificar',
}

// Orden de columnas: mayor urgencia primero
const ORDEN: Etapa[] = ['caliente', 'tibio', 'frio', 'cerrado', 'descartado']

// De dónde llegó el prospecto — el chatbot vive tanto en la web como en WhatsApp.
const CANAL_CFG: Record<string, { label: string; icon: ReactNode }> = {
  web:      { label: 'Web',      icon: <IcChat size={11} /> },
  whatsapp: { label: 'WhatsApp', icon: <IcPhone size={11} /> },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIniciales(nombre: string | null): string {
  if (!nombre?.trim()) return '?'
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Días transcurridos desde una fecha ISO del backend
function diasDesde(fechaIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86_400_000))
}

function fmtFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    const data = err.response.data as { message?: string | string[] }
    if (data?.message) return Array.isArray(data.message) ? data.message.join(', ') : data.message
  }
  return fallback
}

// ─── Sistema de urgencia ──────────────────────────────────────────────────────

type NivelUrgencia = 'urgente' | 'alerta' | 'reciente' | 'normal'

interface UrgInfo {
  nivel:      NivelUrgencia
  borderClr:  string
  diasClr:    string
  diasLabel:  string
}

function urgenciaInfo(dias: number, etapa: Etapa): UrgInfo {
  const lbl = dias <= 0 ? 'Hoy' : `${dias}d`
  // Caliente sin contactar 7+ días = visita vencida
  if (etapa === 'caliente' && dias >= 7)
    return { nivel: 'urgente', borderClr: '#ef4444', diasClr: '#ef4444', diasLabel: lbl }
  if (etapa === 'caliente' && dias >= 4)
    return { nivel: 'alerta', borderClr: '#f59e0b', diasClr: '#f59e0b', diasLabel: lbl }
  if (etapa === 'tibio' && dias >= 12)
    return { nivel: 'alerta', borderClr: '#f59e0b', diasClr: '#f59e0b', diasLabel: lbl }
  if (dias <= 2)
    return { nivel: 'reciente', borderClr: '#10b981', diasClr: '#10b981', diasLabel: lbl }
  return { nivel: 'normal', borderClr: 'transparent', diasClr: 'var(--text3)', diasLabel: lbl }
}

// ─── Donut SVG de puntaje ────────────────────────────────────────────────────

function ScoreDonut({ puntaje, color }: { puntaje: number; color: string }) {
  const r    = 11
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - puntaje / PUNTAJE_MAXIMO)
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="crm-kcard-donut"
      aria-label={`Puntaje ${puntaje} de ${PUNTAJE_MAXIMO}`}>
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(10,26,20,0.1)" strokeWidth="2.5" />
      <circle cx="15" cy="15" r={r}
        fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ.toFixed(2)}
        strokeDashoffset={off.toFixed(2)}
        strokeLinecap="round"
        transform="rotate(-90 15 15)" />
      <text x="15" y="19.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={color}>
        {puntaje}
      </text>
    </svg>
  )
}

// ─── Hero oscuro con métricas y flujo de embudo ────────────────────────────────

interface HeroProps {
  cnts:          Record<string, number>
  sinAsignar:    number
  convPct:       number
  scorePromedio: string
  urgentes:      number
}

function CrmHero({ cnts, sinAsignar, convPct, scorePromedio, urgentes }: HeroProps) {
  const etapas = [
    { icon: <IcSnowflake size={12} />, label: 'Frío',     cnt: cnts['frio'],     clr: '#60a5fa' },
    { icon: <IcThermo size={12} />,    label: 'Tibio',    cnt: cnts['tibio'],    clr: '#fbbf24' },
    { icon: <IcFlame size={12} />,     label: 'Caliente', cnt: cnts['caliente'], clr: '#f87171' },
    { icon: <IcCheck size={12} />,     label: 'Cliente',  cnt: cnts['cerrado'],  clr: '#34d399' },
  ]

  const nodosFunnel: ReactNode[] = []
  etapas.forEach((e, i) => {
    nodosFunnel.push(
      <div key={e.label} className="crm-hero-funnel-stage">
        <span className="crm-hero-funnel-cnt" style={{ color: e.clr }}>{e.cnt}</span>
        <span className="crm-hero-funnel-lbl">{e.icon} {e.label}</span>
        <span className="crm-hero-funnel-rango">{RANGOS_PUNTAJE[ORDEN[i]]}</span>
      </div>
    )
    if (i < etapas.length - 1) {
      nodosFunnel.push(<span key={`sep-${i}`} className="crm-hero-funnel-sep">›</span>)
    }
  })

  return (
    <div className="crm-hero">
      <div className="crm-hero-top">
        <div className="crm-hero-info">
          <span className="crm-hero-kicker">EP-01 · Pipeline CRM</span>
          <h1 className="crm-hero-title">Prospectos</h1>
          <p className="crm-hero-sub">Leads calificados por el chatbot de cotización</p>
        </div>
        {urgentes > 0 && (
          <div className="crm-hero-urgente-badge">
            <IcFlame size={12} /> {urgentes} visita{urgentes > 1 ? 's' : ''} pendiente{urgentes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="crm-hero-stats">
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{cnts['todos'] - cnts['descartado']}</span>
          <span className="crm-hero-stat-lbl">Leads activos</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{sinAsignar}</span>
          <span className="crm-hero-stat-lbl">Sin asignar</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{convPct}%</span>
          <span className="crm-hero-stat-lbl">Conversión</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{scorePromedio}</span>
          <span className="crm-hero-stat-lbl">Score promedio</span>
        </div>
      </div>

      <div className="crm-hero-funnel">
        {nodosFunnel}
        {cnts['descartado'] > 0 && (
          <div className="crm-hero-funnel-desc">
            <IcClose size={11} />
            <span>{cnts['descartado']} desc.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tarjeta de prospecto para el Kanban ─────────────────────────────────────

function ProspectoCard({ p, onClick }: { p: Prospecto; onClick: () => void }) {
  const etapa = etapaDe(p)
  const cfg   = CFG[etapa]
  const ini   = getIniciales(p.nombre)
  const dias  = diasDesde(p.fecha_inicio)
  const urg   = urgenciaInfo(dias, etapa)
  const canal = p.canal_origen ? CANAL_CFG[p.canal_origen] : null

  return (
    <div
      className={`crm-kcard crm-kcard--${urg.nivel}`}
      style={{ borderLeftColor: urg.borderClr }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="crm-kcard-head">
        <span className="crm-kcard-avatar" style={{ background: cfg.color }}>{ini}</span>
        <div className="crm-kcard-ident">
          <span className="crm-kcard-nombre">{p.nombre ?? 'Sin nombre'}</span>
          <span className="crm-kcard-granja">{p.nombre_granja ?? 'Granja sin nombre'}</span>
        </div>
        {p.puntaje_total != null && (
          <ScoreDonut puntaje={p.puntaje_total} color={cfg.color} />
        )}
      </div>

      <div className="crm-kcard-body">
        <span className="crm-kcard-muni"><IcPin size={11} /> {p.municipio ?? 'Municipio sin dato'}</span>

        {canal && (
          <div className="crm-kcard-stats">
            <span className="crm-kcard-stat">{canal.icon} {canal.label}</span>
          </div>
        )}
      </div>

      <div className="crm-kcard-footer">
        <span className="crm-kcard-dias" style={{ color: urg.diasClr }}>
          <IcClock size={11} /> {urg.diasLabel}
        </span>
        {p.telefono ? (
          <a
            className="crm-kcard-call"
            href={`tel:${p.telefono}`}
            onClick={e => e.stopPropagation()}
            aria-label={`Llamar a ${p.nombre ?? 'prospecto'}`}
          >
            <IcPhone size={11} /> Llamar
          </a>
        ) : (
          <span className="crm-kcard-call crm-kcard-call--disabled">Sin teléfono</span>
        )}
      </div>
    </div>
  )
}

// ─── Fila de la vista lista (tabla) ──────────────────────────────────────────

function FilaProspecto({ p, onClick }: { p: Prospecto; onClick: () => void }) {
  const etapa = etapaDe(p)
  const dias  = diasDesde(p.fecha_inicio)
  const urg   = urgenciaInfo(dias, etapa)
  const canal = p.canal_origen ? CANAL_CFG[p.canal_origen] : null

  return (
    <tr className={`crm-fila crm-fila--${etapa}`} onClick={onClick}>
      <td>
        <div className="crm-fila-nombre-wrap">
          <span className="crm-fila-avatar" style={{ background: CFG[etapa].color }}>
            {getIniciales(p.nombre)}
          </span>
          <div>
            <strong>{p.nombre ?? 'Sin nombre'}</strong>
          </div>
        </div>
      </td>
      <td>{p.nombre_granja ?? '—'}</td>
      <td>{p.municipio ?? '—'}</td>
      <td>{canal ? <>{canal.icon} {canal.label}</> : '—'}</td>
      <td>
        {p.puntaje_total != null ? (
          <div className="crm-puntaje">
            <span className="crm-puntaje-num">{p.puntaje_total}</span>
            <div className="crm-puntaje-barra-wrap">
              <div className={`crm-puntaje-barra crm-puntaje-barra--${etapa}`}
                style={{ width: `${(p.puntaje_total / PUNTAJE_MAXIMO) * 100}%` }} />
            </div>
          </div>
        ) : '—'}
      </td>
      <td>
        <span className="crm-tabla-dias" style={{ color: urg.diasClr }}>{urg.diasLabel}</span>
      </td>
      <td>
        <span className={`crm-estado-badge crm-estado-badge--${etapa}`}>
          {CFG[etapa].icon} {CFG[etapa].label}
        </span>
      </td>
      <td>
        {p.telefono ?? '—'}
      </td>
    </tr>
  )
}

// ─── Panel de detalle deslizable ──────────────────────────────────────────────

function DetallePanel({
  resumen, admins, onCerrar, onAsignado,
}: {
  resumen: Prospecto
  admins: Usuario[]
  onCerrar: () => void
  onAsignado: () => void
}) {
  const [detalle, setDetalle]   = useState<ProspectoDetalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  const [asesorId, setAsesorId] = useState<number | ''>('')
  const [asignando, setAsignando] = useState(false)
  const [errorAsignar, setErrorAsignar] = useState('')

  useEffect(() => {
    setCargando(true)
    obtenerProspecto(resumen.id)
      .then(setDetalle)
      .catch(err => setError(mensajeError(err, 'No se pudo cargar el detalle del prospecto.')))
      .finally(() => setCargando(false))
  }, [resumen.id])

  const etapa = etapaDe(resumen)
  const cfg   = CFG[etapa]
  const ini   = getIniciales(resumen.nombre)
  const dias  = diasDesde(resumen.fecha_inicio)
  const urg   = urgenciaInfo(dias, etapa)

  async function handleAsignar() {
    if (!asesorId) return
    setAsignando(true)
    setErrorAsignar('')
    try {
      await asignarAsesor(resumen.id, asesorId)
      onAsignado()
      const actualizado = await obtenerProspecto(resumen.id)
      setDetalle(actualizado)
    } catch (err) {
      setErrorAsignar(mensajeError(err, 'No se pudo asignar el asesor.'))
    } finally {
      setAsignando(false)
    }
  }

  return (
    <div className="crm-overlay" onClick={onCerrar}>
      <aside className="crm-detalle" onClick={e => e.stopPropagation()}>

        <div className="crm-detalle-head" style={{ borderBottomColor: cfg.color }}>
          <span className="crm-detalle-avatar" style={{ background: cfg.color }}>{ini}</span>
          <div className="crm-detalle-ident">
            <h2 className="crm-detalle-nombre">{resumen.nombre ?? 'Sin nombre'}</h2>
            {detalle?.rol_prospecto && <span className="crm-detalle-rol">{detalle.rol_prospecto}</span>}
          </div>
          <button className="crm-detalle-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={17} />
          </button>
        </div>

        <div className="crm-detalle-body">

          <div className="crm-det-row">
            <span className="crm-det-lbl">Estado</span>
            <span className="crm-det-badge"
              style={{ background: cfg.colorLight, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          {resumen.puntaje_total != null && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Puntaje</span>
              <div className="crm-det-score-wrap">
                <strong style={{ color: cfg.color }}>{resumen.puntaje_total}</strong>
                <span className="crm-det-score-max"> / {PUNTAJE_MAXIMO}</span>
                <span className="crm-det-score-rango">· {RANGOS_PUNTAJE[etapa]}</span>
              </div>
            </div>
          )}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Primer contacto</span>
            <span style={{ color: urg.diasClr, fontWeight: 600, fontSize: '0.84rem' }}>
              {urg.diasLabel === 'Hoy' ? 'Hoy' : `Hace ${urg.diasLabel}`}
            </span>
          </div>

          <div className="crm-det-sep" />

          <p className="crm-det-section">Granja</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Nombre</span>
            <span className="crm-det-val">{resumen.nombre_granja ?? '—'}</span>
          </div>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Municipio</span>
            <span className="crm-det-val">{resumen.municipio ?? '—'}</span>
          </div>
          {detalle?.tipo_produccion && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Tipo de producción</span>
              <span className="crm-det-val">{detalle.tipo_produccion}</span>
            </div>
          )}
          {detalle?.area_granja_m2 != null && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Área de la granja</span>
              <span className="crm-det-val">{detalle.area_granja_m2.toLocaleString()} m²</span>
            </div>
          )}
          {detalle?.area_galpon_m2 != null && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Área por galpón</span>
              <span className="crm-det-val">{detalle.area_galpon_m2.toLocaleString()} m²</span>
            </div>
          )}

          <div className="crm-det-sep" />

          <p className="crm-det-section">Contacto</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Teléfono</span>
            {resumen.telefono
              ? <a href={`tel:${resumen.telefono}`} className="crm-det-link">{resumen.telefono}</a>
              : <span className="crm-det-val">—</span>}
          </div>
          {detalle?.email && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Correo</span>
              <a href={`mailto:${detalle.email}`} className="crm-det-link crm-det-link--truncate">
                {detalle.email}
              </a>
            </div>
          )}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Primer contacto</span>
            <span className="crm-det-val">{fmtFecha(resumen.fecha_inicio)}</span>
          </div>

          <div className="crm-det-sep" />

          <p className="crm-det-section">Asesor</p>
          {detalle?.asesor ? (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Asignado a</span>
              <span className="crm-det-val">{detalle.asesor.nombre_completo}</span>
            </div>
          ) : resumen.estado === 'calificado' ? (
            <div className="crm-det-asesor">
              <select
                className="crm-det-asesor-select"
                value={asesorId}
                onChange={e => setAsesorId(e.target.value ? Number(e.target.value) : '')}
                disabled={asignando}
              >
                <option value="">Elegir administrador…</option>
                {admins.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre_completo}</option>
                ))}
              </select>
              <button
                className="crm-det-btn crm-det-btn--primary"
                onClick={handleAsignar}
                disabled={!asesorId || asignando}
              >
                {asignando ? 'Asignando…' : 'Asignar'}
              </button>
            </div>
          ) : (
            <p className="crm-det-asesor-nota">
              Se puede asignar un asesor cuando el prospecto quede calificado por el chatbot.
            </p>
          )}
          {errorAsignar && <p className="crm-det-error">{errorAsignar}</p>}

          {cargando && <p className="crm-det-cargando">Cargando conversación…</p>}
          {error && <p className="crm-det-error">{error}</p>}

          {detalle && detalle.respuestas.length > 0 && (
            <>
              <div className="crm-det-sep" />
              <p className="crm-det-section">Conversación con el chatbot</p>
              <div className="crm-det-transcript">
                {detalle.respuestas.map((r, i) => (
                  <div key={i} className="crm-det-transcript-item">
                    {r.pregunta_texto && <p className="crm-det-transcript-q">{r.pregunta_texto}</p>}
                    <p className="crm-det-transcript-a">{r.respuesta_texto ?? '—'}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="crm-detalle-acciones">
          {resumen.telefono && (
            <a href={`tel:${resumen.telefono}`} className="crm-det-btn crm-det-btn--primary">
              <IcPhone size={15} /> Llamar ahora
            </a>
          )}
          {detalle?.email && (
            <a href={`mailto:${detalle.email}`} className="crm-det-btn crm-det-btn--ghost">
              Enviar correo
            </a>
          )}
        </div>

      </aside>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function CrmPage() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [admins, setAdmins]         = useState<Usuario[]>([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState('')

  const [vista,        setVista]        = useState<'kanban' | 'tabla'>('kanban')
  const [filtro,       setFiltro]       = useState<'todos' | Etapa>('todos')
  const [busqueda,     setBusqueda]     = useState('')
  const [seleccionado, setSeleccionado] = useState<Prospecto | null>(null)
  const [exportando,   setExportando]   = useState(false)

  function cargar() {
    setCargando(true)
    setError('')
    Promise.all([listarProspectos({ limit: 100 }), listarUsuarios()])
      .then(([resProspectos, usuarios]) => {
        setProspectos(resProspectos.data)
        setAdmins(usuarios.filter(u => u.rol.nombre === 'Administrador' && u.activo))
      })
      .catch(err => setError(mensajeError(err, 'No se pudieron cargar los prospectos.')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  async function handleExportar() {
    setExportando(true)
    try {
      const blob = await exportarProspectosCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'prospectos.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo exportar el CSV.')
    } finally {
      setExportando(false)
    }
  }

  const cnts: Record<string, number> = {
    todos:      prospectos.length,
    caliente:   prospectos.filter(p => etapaDe(p) === 'caliente').length,
    tibio:      prospectos.filter(p => etapaDe(p) === 'tibio').length,
    frio:       prospectos.filter(p => etapaDe(p) === 'frio').length,
    descartado: prospectos.filter(p => etapaDe(p) === 'descartado').length,
    cerrado:    prospectos.filter(p => etapaDe(p) === 'cerrado').length,
  }

  const leadsActivos  = prospectos.filter(p => etapaDe(p) !== 'descartado')
  const convPct       = leadsActivos.length > 0 ? Math.round((cnts['cerrado'] / leadsActivos.length) * 100) : 0
  const scoreActivos  = leadsActivos.filter(p => p.puntaje_total != null)
  const scorePromedio = scoreActivos.length
    ? (scoreActivos.reduce((s, p) => s + (p.puntaje_total ?? 0), 0) / scoreActivos.length).toFixed(1)
    : '—'
  const sinAsignar = prospectos.filter(p => p.estado === 'calificado' && !p.asesor_asignado_id).length
  const urgentes = prospectos.filter(p =>
    etapaDe(p) === 'caliente' && diasDesde(p.fecha_inicio) >= 4,
  ).length

  const prospectosVisibles = useMemo(() => {
    let result = prospectos
    if (vista === 'tabla' && filtro !== 'todos') {
      result = result.filter(p => etapaDe(p) === filtro)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(p =>
        (p.nombre ?? '').toLowerCase().includes(q) ||
        (p.nombre_granja ?? '').toLowerCase().includes(q) ||
        (p.municipio ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [prospectos, vista, filtro, busqueda])

  return (
    <div className="page-container crm-page">

      <CrmHero
        cnts={cnts}
        sinAsignar={sinAsignar}
        convPct={convPct}
        scorePromedio={scorePromedio}
        urgentes={urgentes}
      />

      {error && <div className="crm-error-banner">{error}</div>}

      <div className="crm-toolbar">
        <div className="crm-search">
          <IcSearch size={14} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Buscar prospecto, granja o municipio…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="crm-search-clear" onClick={() => setBusqueda('')}>
              <IcClose size={13} />
            </button>
          )}
        </div>

        <div className="crm-vista-toggle">
          <button
            className={`crm-vista-btn${vista === 'kanban' ? ' crm-vista-btn--activo' : ''}`}
            onClick={() => setVista('kanban')}
          >
            <IcGrid size={14} /> Kanban
          </button>
          <button
            className={`crm-vista-btn${vista === 'tabla' ? ' crm-vista-btn--activo' : ''}`}
            onClick={() => setVista('tabla')}
          >
            <IcUsers size={14} /> Lista
          </button>
          <button className="crm-vista-btn" onClick={handleExportar} disabled={exportando}>
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="crm-vacio-simple">Cargando prospectos…</p>
      ) : prospectos.length === 0 ? (
        <div className="crm-vacio">
          <span className="crm-vacio-emoji"><IcUsers size={22} /></span>
          <p>Todavía no hay prospectos. Aparecerán aquí en cuanto alguien hable con el chatbot de la portada.</p>
        </div>
      ) : (
        <>
          {vista === 'kanban' && (
            <div className="crm-kanban">
              {ORDEN.map(etapa => {
                const cfg      = CFG[etapa]
                const colItems = prospectosVisibles.filter(p => etapaDe(p) === etapa)
                return (
                  <div key={etapa}
                    className={`crm-kanban-lane crm-kanban-lane--${etapa}`}
                    style={{ borderLeftColor: cfg.color }}
                  >
                    <div className="crm-kanban-head">
                      <span className="crm-kanban-head-emoji">{cfg.icon}</span>
                      <span className="crm-kanban-head-title">{cfg.label}</span>
                      <span className="crm-kanban-count"
                        style={{ background: cfg.colorLight, color: cfg.color }}>
                        {colItems.length}
                      </span>
                    </div>

                    <div className="crm-kanban-body">
                      {colItems.length === 0 ? (
                        <div className="crm-kanban-vacio"><p>Sin prospectos</p></div>
                      ) : (
                        colItems.map(p => (
                          <ProspectoCard key={p.id} p={p} onClick={() => setSeleccionado(p)} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {vista === 'tabla' && (
            <>
              <div className="crm-filtros">
                {(['todos', ...ORDEN] as const).map(e => (
                  <button key={e}
                    className={`crm-filtro${filtro === e ? ' crm-filtro--activo' : ''}`}
                    onClick={() => setFiltro(e)}
                  >
                    {e === 'todos' ? 'Todos' : <>{CFG[e].icon} {CFG[e].label}</>}
                    {' '}({e === 'todos' ? prospectos.length : cnts[e]})
                  </button>
                ))}
              </div>

              <div className="crm-tabla-card">
                <table className="crm-tabla">
                  <thead>
                    <tr>
                      <th>Prospecto</th>
                      <th>Granja</th>
                      <th>Municipio</th>
                      <th>Canal</th>
                      <th>Puntaje</th>
                      <th>Días</th>
                      <th>Estado</th>
                      <th>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospectosVisibles.map(p => (
                      <FilaProspecto key={p.id} p={p} onClick={() => setSeleccionado(p)} />
                    ))}
                  </tbody>
                </table>
                {prospectosVisibles.length === 0 && (
                  <div className="crm-vacio">
                    <span className="crm-vacio-emoji"><IcSearch size={22} /></span>
                    <p>No hay prospectos que coincidan con la búsqueda</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {seleccionado && (
        <DetallePanel
          resumen={seleccionado}
          admins={admins}
          onCerrar={() => setSeleccionado(null)}
          onAsignado={cargar}
        />
      )}

    </div>
  )
}

export default CrmPage
