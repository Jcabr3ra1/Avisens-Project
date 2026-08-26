// AdminPage.tsx — Panel exclusivo del Administrador del sistema Avisens.
// Épicas cubiertas: EP-03 (usuarios), EP-01 (CRM), EP-08 (infraestructura).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarUsuarios, getUsuario } from '@shared/api'
import type { Usuario } from '@shared/api'
import {
  IcUsers, IcGrid, IcServer, IcLeaf, IcEgg,
  IcBox, IcPhone, IcBell, IcChevronRight,
} from '@shared/ui/icons/icons'
import { GRANJAS_DETALLE } from '../granjas/data'
import { LEADS_MOCK } from '../crm/data'
import { GALPONES_MONITOREO } from '../monitoreo/data'
import './AdminPage.css'

// ─── KPIs globales — calculados de los mismos datos que usan Granjas y Monitoreo ─
// (antes eran números sueltos que no coincidían con el resto de la app)
const TODOS_LOS_GALPONES = GRANJAS_DETALLE.flatMap(g => g.galpones)
const TODOS_LOS_SENSORES = GALPONES_MONITOREO.flatMap(g => g.sensores)
const SENSORES_ONLINE    = TODOS_LOS_SENSORES.filter(s => s.estado !== 'offline').length
const UPTIME_PCT = TODOS_LOS_SENSORES.length > 0
  ? Math.round((SENSORES_ONLINE / TODOS_LOS_SENSORES.length) * 1000) / 10
  : 0

// Una granja cuenta como "activa" si al menos uno de sus galpones tiene un lote activo
const GRANJAS_ACTIVAS = GRANJAS_DETALLE.filter(g => g.galpones.some(gp => gp.estado === 'activo')).length

const KPI_GLOBALES = [
  {
    label: 'Granjas activas', valor: GRANJAS_ACTIVAS,
    sub: `de ${GRANJAS_DETALLE.length} granjas registradas`,
    color: 'verde', icono: 'granja',
  },
  {
    label: 'Galpones', valor: TODOS_LOS_GALPONES.length,
    sub: `${TODOS_LOS_GALPONES.filter(g => g.estado === 'activo').length} activos`,
    color: 'azul', icono: 'galpon',
  },
  {
    label: 'Aves en sistema',
    valor: TODOS_LOS_GALPONES.reduce((s, g) => s + g.avesActuales, 0).toLocaleString('es-CO'),
    sub: 'en lotes activos', color: 'naranja', icono: 'aves',
  },
  {
    label: 'Sensores online', valor: `${SENSORES_ONLINE}/${TODOS_LOS_SENSORES.length}`,
    sub: `${UPTIME_PCT}% uptime`, color: 'teal', icono: 'sensor',
  },
]

// ─── Embudo de ventas CRM — calculado de los mismos leads que muestra el CRM ──
function contarLeads(estado: string) {
  return LEADS_MOCK.filter(l => l.estado === estado).length
}
const CRM_ETAPAS = [
  { etapa: 'Fríos',     desc: 'Primer contacto',        count: contarLeads('frio'),     color: '#94a3b8' },
  { etapa: 'Tibios',    desc: 'Demo / propuesta',       count: contarLeads('tibio'),    color: '#f59e0b' },
  { etapa: 'Calientes', desc: 'Visita programada',      count: contarLeads('caliente'), color: '#ef4444' },
  { etapa: 'Cerrados',  desc: 'Contrato firmado',       count: contarLeads('cerrado'),  color: '#10b981' },
]
// Leads calificados = todos menos los descartados (sin poder de decisión o sin interés)
const LEADS_CALIFICADOS = LEADS_MOCK.length - contarLeads('descartado')

// ─── Relativiza una fecha ISO a texto corto: "hace 12 min", "hace 3 h", "ayer" ─
function hace(fechaIso: string): string {
  const ms = Date.now() - new Date(fechaIso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)   return 'justo ahora'
  if (min < 60)  return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}

// ─── Estado de los 8 módulos con porcentaje de implementación ─────────────────
type EstadoT = 'activo' | 'progreso' | 'planeado'
const MODULOS: { ep: string; nombre: string; estado: EstadoT; pct: number }[] = [
  { ep: 'EP-01', nombre: 'CRM · Prospectos',    estado: 'progreso', pct: 50 },
  { ep: 'EP-02', nombre: 'AVIA Asistente',       estado: 'planeado', pct:  0 },
  { ep: 'EP-03', nombre: 'Gestión de usuarios',  estado: 'activo',   pct: 90 },
  { ep: 'EP-04', nombre: 'Monitoreo IoT',        estado: 'activo',   pct: 85 },
  { ep: 'EP-05', nombre: 'Alertas inteligentes', estado: 'activo',   pct: 70 },
  { ep: 'EP-06', nombre: 'Bitácora productiva',  estado: 'activo',   pct: 80 },
  { ep: 'EP-07', nombre: 'Finanzas',             estado: 'progreso', pct: 40 },
  { ep: 'EP-08', nombre: 'Infraestructura IoT',  estado: 'activo',   pct: 75 },
]

const ESTADO_LABEL: Record<EstadoT, string> = {
  activo:   'Activo',
  progreso: 'En progreso',
  planeado: 'Planeado',
}

// Color del anillo de progreso según estado
const RING_COLOR: Record<EstadoT, string> = {
  activo:   '#10b981',
  progreso: '#f59e0b',
  planeado: '#94a3b8',
}

// ─── Anillo SVG de progreso para módulos ──────────────────────────────────────
function RingProgress({ pct, color }: { pct: number; color: string }) {
  const r    = 13
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - pct / 100)
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      {/* Pista del anillo */}
      <circle cx="18" cy="18" r={r}
        fill="none" stroke="rgba(16,44,35,0.1)" strokeWidth="2.8" />
      {/* Arco de progreso */}
      <circle cx="18" cy="18" r={r}
        fill="none" stroke={color} strokeWidth="2.8"
        strokeDasharray={circ.toFixed(2)}
        strokeDashoffset={off.toFixed(2)}
        strokeLinecap="round"
        transform="rotate(-90 18 18)" />
      {/* Porcentaje al centro */}
      <text x="18" y="22" textAnchor="middle"
        fontSize="7.5" fontWeight="800"
        fill={pct === 0 ? '#94a3b8' : color}>
        {pct}%
      </text>
    </svg>
  )
}

// ─── KPI embebido en el hero oscuro ───────────────────────────────────────────
type KpiProps = {
  label: string; valor: string | number; sub: string
  color: string; icono: string
}
function HeroKpi({ label, valor, sub, icono }: KpiProps) {
  const iconoEl = ({
    granja: <IcLeaf   size={16} />,
    galpon: <IcBox    size={16} />,
    aves:   <IcEgg    size={16} />,
    sensor: <IcServer size={16} />,
  } as Record<string, React.ReactNode>)[icono] ?? <IcGrid size={16} />

  return (
    <div className="admin-hero-kpi">
      <div className="admin-hero-kpi-top">
        <span className="admin-hero-kpi-icon">{iconoEl}</span>
      </div>
      <span className="admin-hero-kpi-valor">{valor}</span>
      <span className="admin-hero-kpi-label">{label}</span>
      <span className="admin-hero-kpi-sub">{sub}</span>
    </div>
  )
}

// ─── Tarjeta de acción rápida ─────────────────────────────────────────────────
type AccionProps = {
  titulo: string; desc: string; ep: string
  icono: React.ReactNode
  color: 'verde' | 'azul' | 'naranja'
  onClick: () => void
}
function AccionCard({ titulo, desc, ep, icono, color, onClick }: AccionProps) {
  return (
    <button className={`admin-accion admin-accion--${color}`} onClick={onClick}>
      <span className="admin-accion-ep">{ep}</span>
      <span className="admin-accion-icon">{icono}</span>
      <div className="admin-accion-text">
        <strong>{titulo}</strong>
        <span>{desc}</span>
      </div>
      <IcChevronRight size={16} className="admin-accion-arrow" />
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
function AdminPage() {
  const navigate = useNavigate()
  const usuario  = getUsuario()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)

  // Carga usuarios reales de la API (EP-03 HU-15)
  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const totalPropietarios = usuarios.filter(u => u.rol.nombre === 'Propietario').length
  const totalOperarios    = usuarios.filter(u => u.rol.nombre === 'Operario').length
  const totalActivos      = usuarios.filter(u => u.activo).length

  // Actividad reciente real: los últimos usuarios registrados, más nuevo primero
  const actividadReciente = [...usuarios]
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    .slice(0, 5)

  const maxLeads      = Math.max(...CRM_ETAPAS.map(e => e.count))
  const cerrados       = CRM_ETAPAS[3].count
  const pctConversion  = LEADS_CALIFICADOS > 0 ? Math.round((cerrados / LEADS_CALIFICADOS) * 1000) / 10 : 0
  const fechaHoy      = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="page-container admin-page">

      {/* ── Hero: banner oscuro con KPIs y sparklines ──────────────────────── */}
      <div className="admin-hero">

        {/* Patrón decorativo de puntos — capa SVG posicionada en absoluto */}
        <svg className="admin-hero-pattern" aria-hidden="true">
          <defs>
            <pattern id="adm-dots" x="0" y="0" width="20" height="20"
              patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#adm-dots)" />
        </svg>

        {/* Encabezado del hero: título + estado + fecha */}
        <div className="admin-hero-top">
          <div>
            <p className="admin-hero-eyebrow">Panel de Administración · Avisens</p>
            <h1 className="admin-hero-title">
              Hola, {usuario?.nombre?.split(' ')[0] ?? 'Admin'}
            </h1>
          </div>
          <div className="admin-hero-badges">
            <div className="admin-hero-status">
              <span className="admin-hero-pulse" />
              <span>Sistema operativo</span>
            </div>
            <span className="admin-hero-fecha">{fechaHoy}</span>
          </div>
        </div>

        {/* 4 KPIs globales con sparklines */}
        <div className="admin-hero-kpis">
          {KPI_GLOBALES.map(kpi => (
            <HeroKpi key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      {/* ── Pipeline CRM + actividad reciente ──────────────────────────────── */}
      <div className="admin-mid-row">

        {/* CRM Pipeline — EP-01 ─────────────────────────────────────────────── */}
        <div className="admin-card admin-crm">
          <div className="admin-card-head">
            <span className="admin-card-title">
              <IcPhone size={15} /> Pipeline CRM
            </span>
            <button className="admin-card-link" onClick={() => navigate('/crm')}>
              Ver todos <IcChevronRight size={13} />
            </button>
          </div>
          <p className="admin-card-sub">Leads activos este mes por etapa de conversión</p>

          {/* Embudo centrado: barras centradas forman visualmente un triángulo */}
          <div className="admin-funnel">
            {CRM_ETAPAS.map(etapa => (
              <div key={etapa.etapa} className="admin-funnel-row">
                <div className="admin-funnel-meta">
                  <span className="admin-funnel-label">{etapa.etapa}</span>
                  <span className="admin-funnel-desc">{etapa.desc}</span>
                </div>
                <div className="admin-funnel-track">
                  <div
                    className="admin-funnel-bar"
                    style={{
                      width: `${(etapa.count / maxLeads) * 100}%`,
                      background: `linear-gradient(90deg, ${etapa.color}99, ${etapa.color})`,
                    }}
                  />
                </div>
                <span className="admin-funnel-count" style={{ color: etapa.color }}>
                  {etapa.count}
                </span>
              </div>
            ))}
          </div>

          {/* Pie: tasa de conversión con barra de progreso */}
          <div className="admin-crm-footer">
            <span>Conversión total (leads calificados → cerrados)</span>
            <div className="admin-crm-conv">
              <div className="admin-crm-conv-track">
                <span className="admin-crm-conv-bar"
                  style={{ width: `${pctConversion * 3}%` }} />
              </div>
              <strong>{pctConversion}%</strong>
            </div>
          </div>
        </div>

        {/* Actividad reciente — EP-03 ───────────────────────────────────────── */}
        <div className="admin-card admin-actividad">
          <div className="admin-card-head">
            <span className="admin-card-title">
              <IcBell size={15} /> Actividad reciente
            </span>
            <button className="admin-card-link" onClick={() => navigate('/usuarios')}>
              Gestionar <IcChevronRight size={13} />
            </button>
          </div>
          <p className="admin-card-sub">Usuarios del sistema y últimas acciones</p>

          {/* Contadores reales de la API */}
          <div className="admin-act-counters">
            <div className="admin-act-counter">
              <strong>{cargando ? '…' : usuarios.length}</strong>
              <span>Total</span>
            </div>
            <div className="admin-act-counter">
              <strong>{cargando ? '…' : totalPropietarios}</strong>
              <span>Propietarios</span>
            </div>
            <div className="admin-act-counter">
              <strong>{cargando ? '…' : totalOperarios}</strong>
              <span>Operarios</span>
            </div>
            <div className="admin-act-counter admin-act-counter--activo">
              <strong>{cargando ? '…' : totalActivos}</strong>
              <span>Activos</span>
            </div>
          </div>

          {/* Timeline de actividad reciente — usuarios reales, más nuevo primero */}
          {actividadReciente.length === 0 ? (
            <p className="admin-feed-vacio">
              {cargando ? 'Cargando…' : 'Sin usuarios registrados todavía.'}
            </p>
          ) : (
            <ul className="admin-feed">
              {actividadReciente.map((u) => {
                const iniciales     = u.nombre_completo.split(' ').slice(0, 2).map(p => p[0]).join('')
                const esPropietario = u.rol.nombre === 'Propietario'
                return (
                  <li key={u.id} className="admin-feed-item">
                    <span className={`admin-feed-avatar admin-feed-avatar--${esPropietario ? 'p' : 'o'}`}>
                      {iniciales}
                    </span>
                    <div className="admin-feed-info">
                      <span className="admin-feed-nombre">{u.nombre_completo}</span>
                      <span className="admin-feed-meta">
                        Registrado{' · '}{u.rol.nombre}
                      </span>
                    </div>
                    <span className="admin-feed-hace">{hace(u.fecha_creacion)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Estado de los 8 módulos con anillos de progreso ────────────────── */}
      <div className="admin-card admin-modulos">
        <div className="admin-card-head">
          <span className="admin-card-title">
            <IcGrid size={15} /> Estado del sistema
          </span>
          <div className="admin-modulos-legend">
            <span><span className="admin-dot admin-dot--activo"   />Activo</span>
            <span><span className="admin-dot admin-dot--progreso" />En progreso</span>
            <span><span className="admin-dot admin-dot--planeado" />Planeado</span>
          </div>
        </div>
        <p className="admin-card-sub">Cobertura de implementación por épica</p>
        <div className="admin-modulos-grid">
          {MODULOS.map(mod => (
            <div key={mod.ep} className={`admin-modulo admin-modulo--${mod.estado}`}>
              <RingProgress pct={mod.pct} color={RING_COLOR[mod.estado]} />
              <div className="admin-modulo-info">
                <span className="admin-modulo-ep">{mod.ep}</span>
                <span className="admin-modulo-nombre">{mod.nombre}</span>
              </div>
              <span className={`admin-modulo-badge admin-modulo-badge--${mod.estado}`}>
                {ESTADO_LABEL[mod.estado]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Acciones rápidas: EP-03, EP-01, EP-08 ──────────────────────────── */}
      <div className="admin-acciones">
        <AccionCard
          titulo="Gestionar usuarios"
          desc="Crear, editar e inactivar cuentas de Propietarios y Operarios."
          ep="EP-03" icono={<IcUsers size={22} />} color="verde"
          onClick={() => navigate('/usuarios')}
        />
        <AccionCard
          titulo="CRM · Prospectos"
          desc="Pipeline de leads calificados por el chatbot de cotización."
          ep="EP-01" icono={<IcPhone size={22} />} color="azul"
          onClick={() => navigate('/crm')}
        />
        <AccionCard
          titulo="Infraestructura"
          desc="Registrar galpones, mapear sensores y gestionar mantenimiento IoT."
          ep="EP-08" icono={<IcServer size={22} />} color="naranja"
          onClick={() => navigate('/infraestructura')}
        />
      </div>

    </div>
  )
}

export default AdminPage
