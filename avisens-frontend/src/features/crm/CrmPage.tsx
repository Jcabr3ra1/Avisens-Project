// CrmPage.tsx — Módulo CRM de Prospectos (EP-01 HU-08).
// Kanban con donut de puntaje, semáforo de urgencia, acciones rápidas y hero con métricas.

import { useState, useMemo, type ReactNode } from 'react'
import { LEADS_MOCK, RANGOS_PUNTAJE, type Lead, type EstadoLead } from './data'
import {
  IcSearch, IcGrid, IcUsers, IcPhone, IcClose, IcPin,
  IcFlame, IcThermo, IcSnowflake, IcCheck, IcHome, IcClock, IcEgg,
} from '@shared/ui/icons/icons'
import './CrmPage.css'

// ─── Configuración visual de cada etapa del pipeline ─────────────────────────
const CFG: Record<EstadoLead, {
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

// Orden de columnas: mayor urgencia primero
const ORDEN: EstadoLead[] = ['caliente', 'tibio', 'frio', 'cerrado', 'descartado']

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Obtiene las dos iniciales del nombre completo
function getIniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Parsea DD/MM/YYYY y retorna días transcurridos desde hoy
function diasDesde(fechaStr: string): number {
  const [d, m, y] = fechaStr.split('/').map(Number)
  const hoy   = new Date()
  const fecha = new Date(y, m - 1, d)
  return Math.max(0, Math.floor((hoy.getTime() - fecha.getTime()) / 86_400_000))
}

// Formatea número de aves como "22k", "3.5k" o "800"
function fmtAves(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ─── Sistema de urgencia ──────────────────────────────────────────────────────

// Nivel de urgencia según días sin contacto y estado del lead
type NivelUrgencia = 'urgente' | 'alerta' | 'reciente' | 'normal'

interface UrgInfo {
  nivel:      NivelUrgencia
  borderClr:  string   // color para el borde izquierdo de la card
  diasClr:    string   // color para el badge de días
  diasLabel:  string   // texto del badge ("Hoy", "2d", "12d")
}

function urgenciaInfo(dias: number, estado: EstadoLead): UrgInfo {
  const lbl = dias <= 0 ? 'Hoy' : `${dias}d`
  // Lead caliente sin contactar por 7+ días = visita vencida
  if (estado === 'caliente' && dias >= 7)
    return { nivel: 'urgente', borderClr: '#ef4444', diasClr: '#ef4444', diasLabel: lbl }
  // Lead caliente sin contactar por 4-6 días = alerta
  if (estado === 'caliente' && dias >= 4)
    return { nivel: 'alerta', borderClr: '#f59e0b', diasClr: '#f59e0b', diasLabel: lbl }
  // Lead tibio sin contactar por 12+ días = se está enfriando
  if (estado === 'tibio' && dias >= 12)
    return { nivel: 'alerta', borderClr: '#f59e0b', diasClr: '#f59e0b', diasLabel: lbl }
  // Contacto muy reciente = indicador verde
  if (dias <= 2)
    return { nivel: 'reciente', borderClr: '#10b981', diasClr: '#10b981', diasLabel: lbl }
  return { nivel: 'normal', borderClr: 'transparent', diasClr: 'var(--text3)', diasLabel: lbl }
}

// ─── Donut SVG de puntaje ────────────────────────────────────────────────────

// Anillo de progreso que muestra el puntaje visualmente (esquina superior derecha)
function ScoreDonut({ puntaje, color }: { puntaje: number; color: string }) {
  const r    = 11                         // radio del anillo
  const circ = 2 * Math.PI * r            // circunferencia ≈ 69.1 px
  const off  = circ * (1 - puntaje / 14)  // offset para el arco de progreso
  return (
    <svg
      width="30" height="30"
      viewBox="0 0 30 30"
      className="crm-kcard-donut"
      aria-label={`Puntaje ${puntaje} de 14`}
    >
      {/* Pista vacía del anillo */}
      <circle cx="15" cy="15" r={r}
        fill="none" stroke="rgba(10,26,20,0.1)" strokeWidth="2.5" />
      {/* Arco de progreso (empieza en 12 horas = -90°) */}
      <circle cx="15" cy="15" r={r}
        fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ.toFixed(2)}
        strokeDashoffset={off.toFixed(2)}
        strokeLinecap="round"
        transform="rotate(-90 15 15)" />
      {/* Número centrado */}
      <text x="15" y="19.5" textAnchor="middle"
        fontSize="8.5" fontWeight="800" fill={color}>
        {puntaje}
      </text>
    </svg>
  )
}

// ─── Hero oscuro con métricas y flujo de embudo ────────────────────────────────

interface HeroProps {
  cnts:          Record<string, number>
  avesXEstado:   Record<string, number>  // aves totales por etapa
  avesTotal:     number
  convPct:       number
  scorePromedio: string
  urgentes:      number
}

function CrmHero({ cnts, avesXEstado, avesTotal, convPct, scorePromedio, urgentes }: HeroProps) {
  // Etapas del flujo de conversión con toda la info integrada (reemplaza pipeline cards)
  const etapas = [
    { icon: <IcSnowflake size={12} />, label: 'Frío',     cnt: cnts['frio'],     clr: '#60a5fa', rango: '0 – 6 pts',  aves: avesXEstado['frio']     },
    { icon: <IcThermo size={12} />,    label: 'Tibio',    cnt: cnts['tibio'],    clr: '#fbbf24', rango: '7 – 11 pts', aves: avesXEstado['tibio']    },
    { icon: <IcFlame size={12} />,     label: 'Caliente', cnt: cnts['caliente'], clr: '#f87171', rango: '≥ 12 pts',   aves: avesXEstado['caliente'] },
    { icon: <IcCheck size={12} />,     label: 'Cliente',  cnt: cnts['cerrado'],  clr: '#34d399', rango: 'Convertido', aves: avesXEstado['cerrado']  },
  ]

  // Construye los nodos del embudo con flechas intercaladas
  const nodosFunnel: ReactNode[] = []
  etapas.forEach((e, i) => {
    nodosFunnel.push(
      <div key={e.label} className="crm-hero-funnel-stage">
        <span className="crm-hero-funnel-cnt" style={{ color: e.clr }}>{e.cnt}</span>
        <span className="crm-hero-funnel-lbl">{e.icon} {e.label}</span>
        <span className="crm-hero-funnel-rango">{e.rango}</span>
        {e.aves > 0 && (
          <span className="crm-hero-funnel-aves"><IcEgg size={11} /> {fmtAves(e.aves)}</span>
        )}
      </div>
    )
    if (i < etapas.length - 1) {
      nodosFunnel.push(
        <span key={`sep-${i}`} className="crm-hero-funnel-sep">›</span>
      )
    }
  })

  return (
    <div className="crm-hero">
      {/* Fila superior: título + badge de urgencia */}
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

      {/* Métricas globales del pipeline */}
      <div className="crm-hero-stats">
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{cnts['todos'] - cnts['descartado']}</span>
          <span className="crm-hero-stat-lbl">Leads activos</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{fmtAves(avesTotal)}</span>
          <span className="crm-hero-stat-lbl"><IcEgg size={11} /> Aves pipeline</span>
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

      {/* Embudo de conversión — reemplaza las tarjetas de pipeline separadas */}
      <div className="crm-hero-funnel">
        {nodosFunnel}
        {/* Descartados como nota al margen */}
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

// ─── Tarjeta de lead para el Kanban ─────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const cfg  = CFG[lead.estado]
  const ini  = getIniciales(lead.nombre)
  const dias = diasDesde(lead.fechaContacto)
  const urg  = urgenciaInfo(dias, lead.estado)

  return (
    // Div con rol button para permitir <a> anidado (botón de llamada)
    <div
      className={`crm-kcard crm-kcard--${urg.nivel}`}
      style={{ borderLeftColor: urg.borderClr }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* ── Cabecera: avatar · nombre · donut inline (sin posicionamiento absoluto) */}
      <div className="crm-kcard-head">
        <span className="crm-kcard-avatar" style={{ background: cfg.color }}>{ini}</span>
        <div className="crm-kcard-ident">
          <span className="crm-kcard-nombre">{lead.nombre}</span>
          <span className="crm-kcard-granja">{lead.granja}</span>
        </div>
        {/* Donut como flex-item — no flota encima del texto */}
        {lead.puntaje > 0 && (
          <ScoreDonut puntaje={lead.puntaje} color={cfg.color} />
        )}
      </div>

      {/* ── Cuerpo: ubicación + volumen de la granja */}
      <div className="crm-kcard-body">
        <span className="crm-kcard-muni"><IcPin size={11} /> {lead.municipio}</span>

        {/* Volumen físico — métrica principal para B2B agrícola */}
        {(lead.galpones > 0 || lead.avesLote > 0) && (
          <div className="crm-kcard-stats">
            {lead.galpones > 0 && (
              <span className="crm-kcard-stat">
                <IcHome size={11} /> {lead.galpones} galp.
              </span>
            )}
            {lead.avesLote > 0 && (
              <span className="crm-kcard-stat crm-kcard-stat--aves">
                <IcEgg size={11} /> {fmtAves(lead.avesLote)} aves
              </span>
            )}
          </div>
        )}

        {/* Solo el primer dolor — más de uno satura visualmente */}
        {lead.doloresDetectados.length > 0 && (
          <div className="crm-kcard-dolores">
            <span className="crm-kcard-dolor">{lead.doloresDetectados[0]}</span>
            {lead.doloresDetectados.length > 1 && (
              <span className="crm-kcard-dolor crm-kcard-dolor--extra">
                +{lead.doloresDetectados.length - 1}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Pie: días de urgencia + llamada siempre visible (sin hover) */}
      <div className="crm-kcard-footer">
        <span className="crm-kcard-dias" style={{ color: urg.diasClr }}>
          <IcClock size={11} /> {urg.diasLabel}
        </span>
        <a
          className="crm-kcard-call"
          href={`tel:${lead.telefono}`}
          onClick={e => e.stopPropagation()}
          aria-label={`Llamar a ${lead.nombre}`}
        >
          <IcPhone size={11} /> Llamar
        </a>
      </div>
    </div>
  )
}

// ─── Fila de la vista lista (tabla) ──────────────────────────────────────────

function FilaLead({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const dias = diasDesde(lead.fechaContacto)
  const urg  = urgenciaInfo(dias, lead.estado)
  return (
    <tr className={`crm-fila crm-fila--${lead.estado}`} onClick={onClick}>
      <td>
        <div className="crm-fila-nombre-wrap">
          <span className="crm-fila-avatar"
            style={{ background: CFG[lead.estado].color }}>
            {getIniciales(lead.nombre)}
          </span>
          <div>
            <strong>{lead.nombre}</strong>
            <small className="crm-rol">{lead.rol}</small>
          </div>
        </div>
      </td>
      <td>{lead.granja}</td>
      <td>{lead.municipio}</td>
      <td>{lead.avesLote > 0 ? `${fmtAves(lead.avesLote)} aves` : '—'}</td>
      <td>
        <div className="crm-puntaje">
          <span className="crm-puntaje-num">{lead.puntaje}</span>
          <div className="crm-puntaje-barra-wrap">
            <div className={`crm-puntaje-barra crm-puntaje-barra--${lead.estado}`}
              style={{ width: `${(lead.puntaje / 14) * 100}%` }} />
          </div>
        </div>
      </td>
      {/* Columna días con color de urgencia */}
      <td>
        <span className="crm-tabla-dias" style={{ color: urg.diasClr }}>
          {urg.diasLabel}
        </span>
      </td>
      <td>
        <span className={`crm-estado-badge crm-estado-badge--${lead.estado}`}>
          {CFG[lead.estado].icon} {CFG[lead.estado].label}
        </span>
      </td>
      <td>
        <span>{lead.telefono}</span>
        {lead.correo && <><br /><small>{lead.correo}</small></>}
      </td>
    </tr>
  )
}

// ─── Panel de detalle deslizable ──────────────────────────────────────────────

function DetallePanel({ lead, onCerrar }: { lead: Lead; onCerrar: () => void }) {
  const cfg  = CFG[lead.estado]
  const ini  = getIniciales(lead.nombre)
  const dias = diasDesde(lead.fechaContacto)
  const urg  = urgenciaInfo(dias, lead.estado)

  return (
    // Overlay oscuro — clic fuera cierra el panel
    <div className="crm-overlay" onClick={onCerrar}>
      <aside className="crm-detalle" onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="crm-detalle-head" style={{ borderBottomColor: cfg.color }}>
          <span className="crm-detalle-avatar" style={{ background: cfg.color }}>
            {ini}
          </span>
          <div className="crm-detalle-ident">
            <h2 className="crm-detalle-nombre">{lead.nombre}</h2>
            <span className="crm-detalle-rol">{lead.rol}</span>
          </div>
          <button className="crm-detalle-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={17} />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="crm-detalle-body">

          {/* Estado + puntaje */}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Estado</span>
            <span className="crm-det-badge"
              style={{ background: cfg.colorLight, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          {lead.puntaje > 0 && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Puntaje</span>
              <div className="crm-det-score-wrap">
                <strong style={{ color: cfg.color }}>{lead.puntaje}</strong>
                <span className="crm-det-score-max"> / 14</span>
                <span className="crm-det-score-rango">· {RANGOS_PUNTAJE[lead.estado]}</span>
              </div>
            </div>
          )}
          {/* Días desde contacto con color de urgencia */}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Último contacto</span>
            <span style={{ color: urg.diasClr, fontWeight: 600, fontSize: '0.84rem' }}>
              {urg.diasLabel === 'Hoy' ? 'Hoy' : `Hace ${urg.diasLabel}`}
            </span>
          </div>

          <div className="crm-det-sep" />

          {/* Datos de la granja */}
          <p className="crm-det-section">Granja</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Nombre</span>
            <span className="crm-det-val">{lead.granja}</span>
          </div>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Municipio</span>
            <span className="crm-det-val">{lead.municipio}</span>
          </div>
          {lead.galpones > 0 && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Galpones</span>
              <span className="crm-det-val">{lead.galpones}</span>
            </div>
          )}
          {lead.avesLote > 0 && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Aves / lote</span>
              <span className="crm-det-val">{lead.avesLote.toLocaleString()}</span>
            </div>
          )}

          {/* Dolores detectados */}
          {lead.doloresDetectados.length > 0 && (
            <>
              <div className="crm-det-sep" />
              <p className="crm-det-section">Dolores identificados</p>
              <div className="crm-det-dolores">
                {lead.doloresDetectados.map((d, i) => (
                  <span key={i} className="crm-det-dolor-chip">{d}</span>
                ))}
              </div>
            </>
          )}

          <div className="crm-det-sep" />

          {/* Contacto */}
          <p className="crm-det-section">Contacto</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Teléfono</span>
            <a href={`tel:${lead.telefono}`} className="crm-det-link">{lead.telefono}</a>
          </div>
          {lead.correo && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Correo</span>
              <a href={`mailto:${lead.correo}`} className="crm-det-link crm-det-link--truncate">
                {lead.correo}
              </a>
            </div>
          )}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Primer contacto</span>
            <span className="crm-det-val">{lead.fechaContacto}</span>
          </div>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Asesor</span>
            <span className="crm-det-val">{lead.asesor}</span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="crm-detalle-acciones">
          <a href={`tel:${lead.telefono}`} className="crm-det-btn crm-det-btn--primary">
            <IcPhone size={15} /> Llamar ahora
          </a>
          {lead.correo && (
            <a href={`mailto:${lead.correo}`} className="crm-det-btn crm-det-btn--ghost">
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
  const [vista,        setVista]        = useState<'kanban' | 'tabla'>('kanban')
  const [filtro,       setFiltro]       = useState<'todos' | EstadoLead>('todos')
  const [busqueda,     setBusqueda]     = useState('')
  const [seleccionado, setSeleccionado] = useState<Lead | null>(null)

  // Contadores por estado (sobre todos los leads, sin filtros)
  const cnts: Record<string, number> = {
    todos:      LEADS_MOCK.length,
    caliente:   LEADS_MOCK.filter(l => l.estado === 'caliente').length,
    tibio:      LEADS_MOCK.filter(l => l.estado === 'tibio').length,
    frio:       LEADS_MOCK.filter(l => l.estado === 'frio').length,
    descartado: LEADS_MOCK.filter(l => l.estado === 'descartado').length,
    cerrado:    LEADS_MOCK.filter(l => l.estado === 'cerrado').length,
  }

  // Métricas del hero (excluye descartados)
  const leadsActivos   = LEADS_MOCK.filter(l => l.estado !== 'descartado')
  const avesTotal      = leadsActivos.reduce((s, l) => s + l.avesLote, 0)
  const convPct        = Math.round((cnts['cerrado'] / leadsActivos.length) * 100)
  const scoreActivos   = leadsActivos.filter(l => l.estado !== 'cerrado')
  const scorePromedio  = scoreActivos.length
    ? (scoreActivos.reduce((s, l) => s + l.puntaje, 0) / scoreActivos.length).toFixed(1)
    : '—'
  // Leads calientes que llevan 4+ días sin contacto
  const urgentes = LEADS_MOCK.filter(l =>
    l.estado === 'caliente' && diasDesde(l.fechaContacto) >= 4
  ).length

  // Total de aves por etapa (para el embudo del hero)
  const avesXEstado: Record<string, number> = {}
  ORDEN.forEach(estado => {
    avesXEstado[estado] = LEADS_MOCK
      .filter(l => l.estado === estado)
      .reduce((s, l) => s + l.avesLote, 0)
  })

  // Leads visibles: el filtro de estado aplica solo en vista lista
  const leads = useMemo(() => {
    let result = LEADS_MOCK
    if (vista === 'tabla' && filtro !== 'todos') {
      result = result.filter(l => l.estado === filtro)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(l =>
        l.nombre.toLowerCase().includes(q) ||
        l.granja.toLowerCase().includes(q) ||
        l.municipio.toLowerCase().includes(q)
      )
    }
    return result
  }, [vista, filtro, busqueda])

  return (
    <div className="page-container crm-page">

      {/* ── Hero con métricas + embudo integrado (reemplaza pipeline cards) ─── */}
      <CrmHero
        cnts={cnts}
        avesXEstado={avesXEstado}
        avesTotal={avesTotal}
        convPct={convPct}
        scorePromedio={scorePromedio}
        urgentes={urgentes}
      />

      {/* ── Barra: búsqueda + toggle de vista ───────────────────────────────── */}
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
        </div>
      </div>

      {/* ── Vista Kanban ──────────────────────────────────────────────────────── */}
      {vista === 'kanban' && (
        <div className="crm-kanban">
          {ORDEN.map(estado => {
            const cfg      = CFG[estado]
            const colLeads = leads.filter(l => l.estado === estado)
            // Total de aves en esta columna (solo leads visibles con búsqueda activa)
            const avesCol  = colLeads.reduce((s, l) => s + l.avesLote, 0)
            // Lane horizontal: color en borde izquierdo identifica la etapa
            return (
              <div key={estado}
                className={`crm-kanban-lane crm-kanban-lane--${estado}`}
                style={{ borderLeftColor: cfg.color }}
              >
                {/* Panel lateral izquierdo — encabezado fijo del lane */}
                <div className="crm-kanban-head">
                  <span className="crm-kanban-head-emoji">{cfg.icon}</span>
                  <span className="crm-kanban-head-title">{cfg.label}</span>
                  <span className="crm-kanban-count"
                    style={{ background: cfg.colorLight, color: cfg.color }}>
                    {colLeads.length}
                  </span>
                  {avesCol > 0 && (
                    <span className="crm-kanban-aves"><IcEgg size={10} /> {fmtAves(avesCol)}</span>
                  )}
                </div>

                {/* Área de cards — desplazamiento horizontal */}
                <div className="crm-kanban-body">
                  {colLeads.length === 0 ? (
                    <div className="crm-kanban-vacio">
                      <p>Sin leads</p>
                    </div>
                  ) : (
                    colLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => setSeleccionado(lead)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vista Lista (tabla) ───────────────────────────────────────────────── */}
      {vista === 'tabla' && (
        <>
          {/* Filtros por estado */}
          <div className="crm-filtros">
            {(['todos', ...ORDEN] as const).map(e => (
              <button key={e}
                className={`crm-filtro${filtro === e ? ' crm-filtro--activo' : ''}`}
                onClick={() => setFiltro(e)}
              >
                {e === 'todos' ? 'Todos' : <>{CFG[e].icon} {CFG[e].label}</>}
                {' '}({e === 'todos' ? LEADS_MOCK.length : cnts[e]})
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
                  <th>Aves / lote</th>
                  <th>Puntaje</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <FilaLead
                    key={lead.id}
                    lead={lead}
                    onClick={() => setSeleccionado(lead)}
                  />
                ))}
              </tbody>
            </table>
            {leads.length === 0 && (
              <div className="crm-vacio">
                <span className="crm-vacio-emoji"><IcSearch size={22} /></span>
                <p>No hay leads que coincidan con la búsqueda</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Panel de detalle deslizable ──────────────────────────────────────── */}
      {seleccionado && (
        <DetallePanel
          lead={seleccionado}
          onCerrar={() => setSeleccionado(null)}
        />
      )}

    </div>
  )
}

export default CrmPage
