// DashboardPage.tsx — "Mi galpón" (EP-04 HU-18)
// Layout de dashboard profesional:
//   · Hero con saludo, tabs de galpón y KPIs productivos
//   · Debajo: salud del lote, galpón 3D interactivo y sensores ambientales
//   · Mascota AVIA (se trabaja más adelante)
//
// Consume el hook compartido useMonitoreoAmbiental (galpones/sensores reales)
// más /granjas y /indicadores — el EPEF, FCR y mortalidad ya no se inventan
// con una fórmula basada en el día del lote: son los que calcula el backend
// a partir de los pesajes, consumos y registros de mortalidad reales.

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMonitoreoAmbiental,
  type SensorVista,
  type EstadoSensorVista,
  type GalponMonitoreoVista,
} from '@shared/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { SensorDetail } from '../monitoreo/SensorDetail'
import AviaMascot      from './components/AviaMascot/AviaMascot'
import ChatPanel       from './components/chat/ChatPanel'
import CoopPlaceholder from './components/CoopPlaceholder/CoopPlaceholder'
import type { Galpon as GalponFarmShape } from '@shared/data/farm'
import { listarGranjas, calcularIndicadores, getUsuario } from '@shared/api'
import type { Granja, IndicadorLote } from '@shared/api'
import { alertaFueVista } from '@shared/utils/alertasVistas'
import { IcEgg, IcCal, IcAlert, IcChart, IcScale, IcLeaf, IcHeart, IcBox, IcServer } from '@shared/ui/icons/icons'
import './DashboardPage.css'

// ─── Mensajes y colores por estado del galpón (mismo vocabulario de Granjas) ─
const ESTADO_BADGE_LABEL: Record<string, string> = {
  critico: 'Alerta crítica', advertencia: 'Advertencia', optimo: 'Todo bien', vacio: 'Vacío',
}

// ─── Paleta del hero (tonos claros para fondo oscuro con degradado) ───────────
const HERO_VERDE = '#34d399'
const HERO_AZUL  = '#60a5fa'
const HERO_AMBAR = '#fbbf24'
const HERO_ROJO  = '#f87171'
const HERO_GRIS  = 'rgba(255,255,255,0.45)'

// ═══════════════════════════════════════════════════════════════════════════ //
// Sub-componentes de métricas productivas — se declaran ANTES de DashboardPage
// para evitar errores de referencia en el JSX de TypeScript.
// ═══════════════════════════════════════════════════════════════════════════ //

// ─── Barra de salud del lote (score 0–100) ────────────────────────────────────
function SaludBar({ score }: { score: number }) {
  const { color, label } =
    score >= 88 ? { color: '#10b981', label: 'Excelente' } :
    score >= 72 ? { color: '#3b82f6', label: 'Bueno'     } :
    score >= 55 ? { color: '#f59e0b', label: 'Regular'   } :
                  { color: '#ef4444', label: 'Atención'  }
  return (
    <div className="db-salud-bar">
      <div className="db-salud-bar-head">
        <span className="db-salud-label">Salud del lote</span>
        <span className="db-salud-tag" style={{ background:`${color}18`, color, border:`1px solid ${color}35` }}>
          {label}
        </span>
      </div>
      <div className="db-salud-track">
        <div className="db-salud-fill"
          style={{ width:`${score}%`, background:`linear-gradient(90deg,${color}88,${color})` }} />
      </div>
      <div className="db-salud-bar-foot">
        <span className="db-salud-hint">Sensores · alertas · EPEF</span>
        <span className="db-salud-score" style={{ color }}>{score}<small>/100</small></span>
      </div>
    </div>
  )
}

// ─── Umbrales de calidad para EPEF y FCR (Manual Italcol + estándar industria) ─
function epefEstado(epef: number) {
  return (
    epef >= 320 ? { color: HERO_VERDE, label: 'Excelente' } :
    epef >= 270 ? { color: HERO_AZUL,  label: 'Bueno'     } :
    epef >= 220 ? { color: HERO_AMBAR, label: 'Regular'   } :
    epef >    0 ? { color: HERO_ROJO,  label: 'Bajo'      } :
                  { color: HERO_GRIS,  label: '—'         }
  )
}
function fcrEstado(fcr: number) {
  return (
    fcr > 0 && fcr < 1.65 ? { color: HERO_VERDE, label: 'Excelente' } :
    fcr < 1.80             ? { color: HERO_AZUL,  label: 'Bueno'     } :
    fcr < 2.00             ? { color: HERO_AMBAR, label: 'Regular'   } :
    fcr >= 2.00            ? { color: HERO_ROJO,  label: 'Alto'      } :
                             { color: HERO_GRIS,  label: '—'         }
  )
}

// ─── Tile de KPI del hero: ícono + valor + etiqueta (+ estado opcional) ───────
type HeroKpiProps = {
  icon: ReactNode; label: string; value: string | number
  sub?: string; color?: string
}
function HeroKpi({ icon, label, value, sub, color }: HeroKpiProps) {
  return (
    <div className="db-hero-kpi" role="group" aria-label={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <span className="db-hero-kpi-icon" style={color ? { color } : undefined} aria-hidden="true">{icon}</span>
      <strong className="db-hero-kpi-value" style={color ? { color } : undefined}>{value}</strong>
      <span className="db-hero-kpi-label">{label}</span>
      {sub && <em className="db-hero-kpi-sub" style={color ? { color } : undefined}>{sub}</em>}
    </div>
  )
}

// ─── Calcula el score de salud del lote (0–100) ────────────────────────────────
function calcSalud(galpon: { sensores: SensorVista[] }, alertas: number, epef: number): number {
  let score = 100
  score -= galpon.sensores.filter(s => s.estado === 'critico').length     * 18
  score -= galpon.sensores.filter(s => s.estado === 'advertencia').length * 8
  if (epef >= 320) score += 5
  else if (epef >= 220) score -= 8
  else if (epef > 0)    score -= 18
  score -= alertas * 5
  return Math.max(0, Math.min(100, score))
}

// ═══════════════════════════════════════════════════════════════════════════ //

function DashboardPage() {
  const navigate = useNavigate()
  const { galpones, cargando, error } = useMonitoreoAmbiental()
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [granjaId, setGranjaId] = useState<number | null>(null)
  const [galponId, setGalponId] = useState<number | null>(null)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)
  const [chatOpen,     setChatOpen]     = useState(false)
  const [unread,       setUnread]       = useState(3)
  const [indicador,    setIndicador]    = useState<IndicadorLote | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listarGranjas().then(setGranjas).catch(() => {})
  }, [])

  // Selecciona la primera granja/galpón en cuanto llegan los datos
  useEffect(() => {
    if (granjaId === null && granjas.length > 0) setGranjaId(granjas[0].id)
  }, [granjaId, granjas])
  useEffect(() => {
    if (galponId === null && galpones.length > 0) setGalponId(galpones[0].id)
  }, [galponId, galpones])

  const galponesGranja = galpones.filter(g => g.granjaId === granjaId)
  const galpon = galponesGranja.find(g => g.id === galponId) ?? galponesGranja[0] ?? galpones[0] ?? null

  const tieneActivo = galpon?.loteActivo != null
  const aves = galpon?.loteActivo?.cantidad_inicial ?? 0
  const alertas = galpon ? galpon.sensores.filter(s => s.estado === 'critico' || s.estado === 'advertencia').length : 0
  // Cuántas de esas alertas el usuario todavía NO ha visto en la página de
  // Alertas — solo estas hacen que el avatar AVIA avise (usa el mismo id de
  // sensor que AlertasPage, así que nunca se desincronizan).
  const alertasNoVistas = galpon
    ? galpon.sensores
        .filter(s => s.estado === 'critico' || s.estado === 'advertencia')
        .filter(s => !alertaFueVista(s.id))
        .length
    : 0

  const galponFarm: GalponFarmShape | null = galpon ? {
    id: galpon.id, codigo: galpon.codigo, nombre: galpon.nombre,
    aves, dia: galpon.diaVida,
    status: !tieneActivo ? 'empty' : alertas > 0 ? 'warn' : 'ok',
    alertas,
  } : null

  // ── Indicadores reales del lote activo (FCR/EPEF/mortalidad) ─────────────
  // Se calculan en el backend a partir de pesajes, consumos y mortalidad
  // reales — si el lote todavía no tiene bitácora registrada, vienen en null.
  useEffect(() => {
    const loteId = galpon?.loteActivo?.id
    if (!loteId) { setIndicador(null); return }
    let activo = true
    calcularIndicadores(loteId)
      .then((d) => { if (activo) setIndicador(d) })
      .catch(() => { if (activo) setIndicador(null) })
    return () => { activo = false }
  }, [galpon?.loteActivo?.id])

  useEffect(() => { if (chatOpen) setUnread(0) }, [chatOpen])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setChatOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  function seleccionarGalpon(id: number) {
    setGalponId(id)
    setSensorActivo(null)
  }
  function cambiarGranja(id: number) {
    setGranjaId(id)
    const primero = galpones.find(g => g.granjaId === id)
    if (primero) setGalponId(primero.id)
    setSensorActivo(null)
  }

  const estado = tieneActivo && galpon ? estadoGlobal(galpon) : 'vacio'

  // ── Métricas productivas reales (FCR/EPEF/mortalidad vienen de /indicadores) ─
  const fcr           = indicador?.fcr ?? 0
  const epef          = indicador?.epef ?? 0
  const mortalidad    = indicador?.mortalidad_acumulada_pct ?? 0
  const pesoKg        = indicador?.peso_promedio_g ? +(indicador.peso_promedio_g / 1000).toFixed(2) : 0
  // Viabilidad = % de aves que siguen vivas = 100% − mortalidad acumulada
  const viabilidad    = indicador?.mortalidad_acumulada_pct != null
    ? +(100 - indicador.mortalidad_acumulada_pct).toFixed(1)
    : 0

  const saludScore = tieneActivo && galpon ? calcSalud(galpon, alertas, epef) : 0

  const epefInfo = epefEstado(epef)
  const fcrInfo   = fcrEstado(fcr)
  const alertaColor = alertas === 0 ? HERO_VERDE
    : (galpon?.sensores.some(s => s.estado === 'critico') ?? false) ? HERO_ROJO : HERO_AMBAR
  const viabilidadColor = viabilidad === 0 ? HERO_GRIS
    : viabilidad >= 98 ? HERO_VERDE : viabilidad >= 96 ? HERO_AMBAR : HERO_ROJO
  const mortalidadColor = mortalidad === 0 ? HERO_GRIS
    : mortalidad <= 2 ? HERO_VERDE : mortalidad <= 3 ? HERO_AMBAR : HERO_ROJO

  const usuario  = getUsuario()
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  if (cargando) {
    return (
      <div className="page-container db-page">
        <p className="db-cargando">Cargando tu galpón…</p>
      </div>
    )
  }

  if (!galpon || !galponFarm) {
    return (
      <div className="page-container db-page">
        {error && <div className="db-alert-error" role="alert">{error}</div>}
        <div className="db-3d-vacio">
          <IcBox size={40} />
          <p>Todavía no tienes granjas ni galpones registrados.</p>
          <button className="db-btn-confirmar" onClick={() => navigate('/granjas')}>Ir a Mis Granjas</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container db-page">

      {/* ── HERO: banner oscuro con saludo, tabs de galpón y KPIs ───────────── */}
      <div className="db-hero">
        <svg className="db-hero-pattern" aria-hidden="true">
          <defs>
            <pattern id="db-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#db-dots)" />
        </svg>

        <div className="db-hero-top">
          <div>
            <p className="db-hero-eyebrow">Mi galpón <span className="db-hero-eyebrow-code">{galpon.codigo}</span></p>
            <div className="db-hero-title-row">
              <h1 className="db-hero-title">Hola, {usuario?.nombre?.split(' ')[0] ?? 'equipo'}</h1>
              <span className={`db-hero-estado db-hero-estado--${estado}`}>
                <span className="db-hero-estado-dot" />
                {ESTADO_BADGE_LABEL[estado] ?? 'Sin lote'}
              </span>
            </div>
          </div>
          <span className="db-hero-fecha">{fechaHoy}</span>
        </div>

        {/* Selector de granja — el dueño puede tener más de una */}
        {granjas.length > 0 && (
          <div className="db-hero-granja-row">
            <span className="db-hero-granja-label">Su granja</span>
            <select
              className="db-hero-granja-select"
              value={granjaId ?? ''}
              onChange={(e) => cambiarGranja(Number(e.target.value))}
            >
              {granjas.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nombre} · {galpones.filter(x => x.granjaId === g.id).length} galpones
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs de galpón */}
        <div className="db-hero-tabs-row">
          <div className="db-hero-tabs">
            {galponesGranja.map(g => {
              const est = g.loteActivo ? estadoGlobal(g) : 'vacio'
              return (
                <button
                  key={g.id}
                  className={`db-hero-tab${g.id === galpon.id ? ' db-hero-tab--activo' : ''}${!g.loteActivo ? ' db-hero-tab--vacio' : ''}`}
                  onClick={() => seleccionarGalpon(g.id)}
                >
                  <span className={`db-dot db-dot--${est}`} />
                  <span className="db-hero-tab-txt">{g.nombre}</span>
                  <span className="db-hero-tab-code">{g.codigo}</span>
                  {g.sensores.some(s => s.estado === 'critico') && <span className="db-tab-warn">!</span>}
                </button>
              )
            })}
          </div>
          <button className="db-hero-btn-nuevo" onClick={() => navigate('/granjas')}>
            + Nuevo galpón
          </button>
        </div>

        {/* KPIs productivos del galpón activo */}
        {tieneActivo ? (
          <div className="db-hero-kpis">
            <HeroKpi icon={<IcEgg   size={16} />} label="Aves"          value={aves.toLocaleString('es-CO')} />
            <HeroKpi icon={<IcCal   size={16} />} label="Día del lote"  value={galpon.diaVida} />
            <HeroKpi icon={<IcHeart size={16} />} label="Mortalidad"    value={mortalidad > 0 ? `${mortalidad}%` : '—'} color={mortalidadColor} />
            <HeroKpi icon={<IcAlert size={16} />} label="Alertas"       value={alertas > 0 ? alertas : 'Ninguna'} color={alertaColor} />
            <HeroKpi icon={<IcChart size={16} />} label="EPEF"          value={epef > 0 ? epef : '—'} sub={epefInfo.label} color={epefInfo.color} />
            <HeroKpi icon={<IcScale size={16} />} label="FCR"           value={fcr > 0 ? fcr : '—'}   sub={fcrInfo.label}  color={fcrInfo.color} />
            <HeroKpi icon={<IcLeaf  size={16} />} label="Viabilidad"    value={viabilidad > 0 ? `${viabilidad}%` : '—'} color={viabilidadColor} />
          </div>
        ) : (
          <p className="db-hero-vacio">Galpón vacío. Asígnale un lote desde Mis Granjas para comenzar el monitoreo.</p>
        )}
      </div>

      {/* ── LAYOUT VERTICAL: cada sección con su propio espacio ────────────── */}
      <div ref={contentRef} className="db-grid">

        {/* ① SALUD DEL LOTE — score único de Avisens */}
        {tieneActivo && <SaludBar score={saludScore} />}

        {/* ② GALPÓN 3D — ocupa todo el ancho, grande */}
        <div className="db-col-right">
          {tieneActivo
            ? <CoopPlaceholder galpon={galponFarm} sensores={galpon.sensores} mortalidadPct={mortalidad || undefined} pesoKg={pesoKg || undefined} />
            : (
              <div className="db-3d-vacio">
                <IcBox size={40} />
                <p>El plano 3D estará disponible cuando asignes un lote activo</p>
              </div>
            )
          }
        </div>

        {/* ③ SENSORES AMBIENTALES — lista completa debajo del 3D */}
        {tieneActivo && galpon.sensores.length > 0 && (
          <div className="db-sensores-wrap">
            <div className="db-sensores-head">
              <span className="db-kicker">Sensores ambientales</span>
              <span className="db-kicker-hint">Toca un sensor para ver el detalle completo</span>
            </div>
            <div className="db-sensores-list">
              {galpon.sensores.map(s => (
                <SensorRow
                  key={s.id}
                  sensor={s}
                  activo={sensorActivo?.id === s.id}
                  onClick={() => s.estado !== 'offline' && setSensorActivo(s)}
                />
              ))}
            </div>
          </div>
        )}

        {!tieneActivo && (
          <div className="db-sin-lote">
            <IcServer size={32} />
            <p>Los sensores se activarán cuando ingreses un nuevo lote al galpón.</p>
          </div>
        )}
      </div>

      {/* ── Panel detalle sensor ─────────────────────────────────────────────── */}
      <SensorDetail
        sensor={sensorActivo}
        galponNombre={galpon.nombre}
        diaVida={galpon.diaVida}
        onClose={() => setSensorActivo(null)}
      />

      {/* ── Mascota AVIA ─────────────────────────────────────────────────────── */}
      <AviaMascot
        message={alertasNoVistas > 0 ? `${alertasNoVistas} alerta${alertasNoVistas > 1 ? 's' : ''} sin revisar` : 'Todo en orden en el galpón'}
        messageType={alertasNoVistas > 0 ? 'warn' : 'ok'}
        messageVisible={true}
        chatOpen={chatOpen}
        unread={unread}
        hasAlerts={alertasNoVistas > 0}
        onToggle={() => setChatOpen(o => !o)}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

// ─── Fila de sensor compacta (columna izquierda) ──────────────────────────────
type SensorRowProps = { sensor: SensorVista; activo: boolean; onClick: () => void }
function SensorRow({ sensor, activo, onClick }: SensorRowProps) {
  const etiqueta: Record<EstadoSensorVista, string> = {
    optimo: 'Óptimo', advertencia: 'Advertencia', critico: 'Crítico', sin_umbral: 'Sin umbral', offline: 'Sin señal',
  }
  return (
    <button
      className={`db-sensor-row db-sensor-row--${sensor.estado}${activo ? ' db-sensor-row--activo' : ''}${sensor.estado !== 'offline' ? ' db-sensor-row--clickable' : ''}`}
      onClick={onClick}
      disabled={sensor.estado === 'offline'}
    >
      <span className="db-sensor-icon">{iconoSensor(sensor.tipo, 16)}</span>
      <span className="db-sensor-nombre">{sensor.tipo}</span>
      <span className="db-sensor-valor">
        {sensor.valor === null ? '—' : `${sensor.valor} ${sensor.unidad}`}
      </span>
      <span className={`db-sensor-badge db-sensor-badge--${sensor.estado}`}>
        {etiqueta[sensor.estado]}
      </span>
      {sensor.estado !== 'offline' && <span className="db-sensor-arrow">›</span>}
    </button>
  )
}

// ─── Estado global del galpón (según sus sensores) ─────────────────────────────
function estadoGlobal(g: GalponMonitoreoVista): EstadoSensorVista {
  if (!g.loteActivo || g.sensores.length === 0) return 'offline'
  if (g.sensores.some(s => s.estado === 'critico'))     return 'critico'
  if (g.sensores.some(s => s.estado === 'advertencia')) return 'advertencia'
  return 'optimo'
}

export default DashboardPage
