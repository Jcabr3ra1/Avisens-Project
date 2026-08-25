// DashboardPage.tsx — "Mi galpón" (EP-04 HU-18)
// Layout de dashboard profesional:
//   · Hero con saludo, tabs de galpón y KPIs productivos
//   · Debajo: salud del lote, galpón 3D interactivo y sensores ambientales
//   · Mascota AVIA (se trabaja más adelante)

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  GALPONES_MONITOREO,
  ICONOS_VARIABLE,
  type Sensor,
  type EstadoSensor,
} from '../monitoreo/data'
import { GRANJAS_DETALLE } from '../granjas/data'
import { SensorDetail } from '../monitoreo/SensorDetail'
import AviaMascot      from './components/AviaMascot/AviaMascot'
import ChatPanel       from './components/chat/ChatPanel'
import CoopPlaceholder from './components/CoopPlaceholder/CoopPlaceholder'
import type { Galpon } from '@shared/data/farm'
import { getUsuario }  from '@shared/api'
import { useLecturasVivas } from '@shared/hooks/useLecturasVivas'
import { calcularEstadoSensor, formatearHace, idAlertaSensor } from '@shared/utils/sensores'
import { alertaFueVista } from '@shared/utils/alertasVistas'
import { IcEgg, IcCal, IcAlert, IcChart, IcScale, IcLeaf, IcHeart, IcBox, IcServer } from '@shared/ui/icons/icons'
import './DashboardPage.css'

// ─── Vista unificada de galpón: junta Granjas (dueño de la verdad de qué      ─
// galpones existen y su estado) con Monitoreo (sensores, cuando los tiene).   ─
// Así "Mi galpón" muestra las 3 granjas del dueño, no solo la primera.        ─
type GalponVista = {
  id: number; codigo: string; nombre: string
  granjaId: number
  estado: 'activo' | 'vacio' | 'preparacion' | 'mantenimiento'
  aves: number; diaVida: number
  sensores: Sensor[]
}

const GALPONES_VISTA: GalponVista[] = GRANJAS_DETALLE.flatMap(granja =>
  granja.galpones.map(g => ({
    id: g.id, codigo: g.codigo, nombre: g.nombre, granjaId: granja.id,
    estado: g.estado, aves: g.avesActuales, diaVida: g.diaVida,
    sensores: GALPONES_MONITOREO.find(m => m.codigo === g.codigo)?.sensores ?? [],
  })),
)

// ─── Mensajes y colores por estado del galpón (mismo vocabulario de Granjas) ─
const ESTADO_BADGE_LABEL: Record<string, string> = {
  critico: 'Alerta crítica', advertencia: 'Advertencia', optimo: 'Todo bien',
  vacio: 'Vacío', preparacion: 'En preparación', mantenimiento: 'En mantenimiento',
}
const MENSAJE_SIN_LOTE: Record<string, string> = {
  vacio: 'Galpón vacío. Asígnale un lote para comenzar el monitoreo.',
  preparacion: 'Este galpón está en preparación para el próximo lote.',
  mantenimiento: 'Este galpón está en mantenimiento. Los sensores se reactivan cuando vuelva a operar.',
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
// Único en Avisens: combina EPEF, alertas y estado ambiental en un solo índice.
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
// EPEF: European Production Efficiency Factor. ≥320 excelente · 270-319 bueno · <220 malo
function epefEstado(epef: number) {
  return (
    epef >= 320 ? { color: HERO_VERDE, label: 'Excelente' } :
    epef >= 270 ? { color: HERO_AZUL,  label: 'Bueno'     } :
    epef >= 220 ? { color: HERO_AMBAR, label: 'Regular'   } :
    epef >    0 ? { color: HERO_ROJO,  label: 'Bajo'      } :
                  { color: HERO_GRIS,  label: '—'         }
  )
}
// FCR: Feed Conversion Ratio — kg alimento / kg peso ganado. <1.65 excelente · >2.00 malo
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
function calcSalud(galpon: { sensores: Sensor[] }, alertas: number, epef: number): number {
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
  const [galpones, setGalpones] = useState<GalponVista[]>(GALPONES_VISTA)
  const [granjaId, setGranjaId] = useState<number>(GRANJAS_DETALLE[0]!.id)
  const [galponId, setGalponId] = useState<number>(GALPONES_VISTA[0]!.id)
  const [sensorActivo, setSensorActivo] = useState<Sensor | null>(null)
  const [chatOpen,     setChatOpen]     = useState(false)
  const [unread,       setUnread]       = useState(3)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [formGalpon,   setFormGalpon]   = useState({ codigo: '', nombre: '' })
  const [errorGalpon,  setErrorGalpon]  = useState('')

  // Referencia para scroll al contenido al cambiar de tab
  const contentRef = useRef<HTMLDivElement>(null)

  // ── Fusión con el sensor real de GP-01 ───────────────────────────────────
  // GP-01 es el único galpón con un ESP32 conectado (ver Monitoreo/Alertas).
  // Aquí se aplica la misma fusión: si ya llegó un valor real de Firebase
  // para una variable, reemplaza el de ejemplo (mock) y se recalcula su
  // estado — así "Mi galpón" nunca muestra una temperatura distinta a la que
  // ya se ve en Sensores o en Alertas para el mismo galpón.
  const lecturasVivasGP01 = useLecturasVivas('GP-01')
  const galponesConVivo = galpones.map(g => {
    if (g.codigo !== 'GP-01') return g
    return {
      ...g,
      sensores: g.sensores.map(s => {
        const vivo = lecturasVivasGP01[s.variable]
        if (!vivo || s.estado === 'offline') return s
        const valor = Math.round(vivo.valor * 10) / 10
        return { ...s, valor, estado: calcularEstadoSensor(valor, s.minUmbral, s.maxUmbral), ultimaLectura: formatearHace(vivo.ts) }
      }),
    }
  })

  // ── Datos de la granja y el galpón seleccionados ─────────────────────────
  const galponesGranja = galponesConVivo.filter(g => g.granjaId === granjaId)
  const galpon   = galponesGranja.find(g => g.id === galponId) ?? galponesGranja[0] ?? galponesConVivo[0]!
  const aves     = galpon.aves
  const alertas  = galpon.sensores.filter(s => s.estado === 'critico' || s.estado === 'advertencia').length
  // Cuántas de esas alertas el usuario todavía NO ha visto en la página de
  // Alertas — solo estas hacen que el avatar AVIA avise. Una vez las mira
  // ahí, deja de insistir con ellas (aunque sigan contando en el KPI de
  // arriba, que muestra el total real, visto o no).
  const alertasNoVistas = galpon.sensores
    .filter(s => s.estado === 'critico' || s.estado === 'advertencia')
    .filter(s => !alertaFueVista(idAlertaSensor(galpon.id, s.variable)))
    .length
  const tieneActivo = galpon.estado === 'activo'
  const galponFarm: Galpon = {
    id: galpon.id, codigo: galpon.codigo, nombre: galpon.nombre,
    aves, dia: galpon.diaVida,
    status: !tieneActivo ? 'empty' : alertas > 0 ? 'warn' : 'ok',
    alertas,
  }

  // ── Efectos ────────────────────────────────────────────────────────────────
  useEffect(() => { if (chatOpen) setUnread(0) }, [chatOpen])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setChatOpen(false); setModalAbierto(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ── Cambiar de galpón / granja ────────────────────────────────────────────
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

  // ── Agregar galpón (a la granja que se está viendo) ──────────────────────
  function handleAgregarGalpon(e: { preventDefault(): void }) {
    e.preventDefault()
    setErrorGalpon('')
    const nombre = formGalpon.nombre.trim()
    if (!nombre) { setErrorGalpon('El nombre es obligatorio.'); return }
    const codigo = formGalpon.codigo.trim().toUpperCase() || `GP-N${galponesGranja.length + 1}`
    if (galpones.some(g => g.codigo === codigo)) {
      setErrorGalpon('Ya existe un galpón con ese código.'); return
    }
    const nuevo: GalponVista = {
      id: Date.now(), codigo, nombre: `Galpón ${nombre}`, granjaId,
      estado: 'vacio', aves: 0, diaVida: 0, sensores: [],
    }
    setGalpones(prev => [...prev, nuevo])
    setFormGalpon({ codigo: '', nombre: '' })
    setModalAbierto(false)
    setGalponId(nuevo.id)
  }

  // Estado del badge: si tiene lote activo, refleja los sensores; si no, la
  // etapa del galpón (vacío / preparación / mantenimiento — igual que Granjas)
  const estado = tieneActivo ? estadoGlobal(galpon) : galpon.estado

  // ── Métricas productivas (diferenciadoras vs competencia) ──────────────────
  // EPEF = (Viabilidad% × Peso promedio kg × 100) / (Días × FCR)
  // FCR  = kg alimento / kg peso ganado (Conversión Alimenticia)
  // Fuente: Manual Italcol + estándar industria avícola colombiana
  const avesIniciales = tieneActivo && aves > 0 ? Math.round(aves / 0.982) : 0
  const viabilidad    = avesIniciales > 0 ? +((aves / avesIniciales) * 100).toFixed(1) : 0
  // Peso promedio estimado según la curva Ross 308 (g → kg)
  const pesoKg        = tieneActivo ? +(0.042 + galpon.diaVida * 0.0448).toFixed(2) : 0
  // FCR mock basado en el día del lote (mejora con el tiempo)
  const fcr           = tieneActivo && galpon.diaVida >= 10
    ? +(1.62 + galpon.diaVida * 0.0048).toFixed(2)
    : 0
  // EPEF: ≥350 excelente, 280-349 bueno, 200-279 regular, <200 malo
  const epef = tieneActivo && fcr > 0
    ? Math.round((viabilidad * pesoKg * 100) / (galpon.diaVida * fcr))
    : 0

  // Mortalidad acumulada mock — crece lento con el día y se estabiliza.
  // EP-06 HU-27: alerta si supera 0.5% diario o 3% acumulado
  const mortalidad = tieneActivo ? Math.min(4.5, +(0.3 + galpon.diaVida * 0.021).toFixed(1)) : 0

  // ── Score de salud del lote (0–100) ──────────────────────────────────────
  // Unique de Avisens — combina EPEF, alertas, sensores y mortalidad
  const saludScore = tieneActivo ? calcSalud(galpon, alertas, epef) : 0

  // ── Estado visual de los tiles del hero ──────────────────────────────────
  const epefInfo = epefEstado(epef)
  const fcrInfo   = fcrEstado(fcr)
  const alertaColor = alertas === 0 ? HERO_VERDE
    : galpon.sensores.some(s => s.estado === 'critico') ? HERO_ROJO : HERO_AMBAR
  const viabilidadColor = viabilidad === 0 ? HERO_GRIS
    : viabilidad >= 98 ? HERO_VERDE : viabilidad >= 96 ? HERO_AMBAR : HERO_ROJO
  const mortalidadColor = mortalidad === 0 ? HERO_GRIS
    : mortalidad <= 2 ? HERO_VERDE : mortalidad <= 3 ? HERO_AMBAR : HERO_ROJO

  // ── Usuario logueado y fecha para el saludo del hero ─────────────────────
  const usuario  = getUsuario()
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page-container db-page">

      {/* ── HERO: banner oscuro con saludo, tabs de galpón y KPIs ───────────── */}
      <div className="db-hero">
        {/* Patrón decorativo de puntos — capa SVG posicionada en absoluto */}
        <svg className="db-hero-pattern" aria-hidden="true">
          <defs>
            <pattern id="db-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#db-dots)" />
        </svg>

        {/* Encabezado: saludo + estado del galpón activo | fecha */}
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
        <div className="db-hero-granja-row">
          <span className="db-hero-granja-label">Su granja</span>
          <select
            className="db-hero-granja-select"
            value={granjaId}
            onChange={(e) => cambiarGranja(Number(e.target.value))}
          >
            {GRANJAS_DETALLE.map(g => (
              <option key={g.id} value={g.id}>{g.nombre} · {g.galpones.length} galpones</option>
            ))}
          </select>
        </div>

        {/* Tabs de galpón + botón agregar, sobre el fondo oscuro */}
        <div className="db-hero-tabs-row">
          <div className="db-hero-tabs">
            {galponesGranja.map(g => {
              const est = g.estado === 'activo' ? estadoGlobal(g) : g.estado
              return (
                <button
                  key={g.id}
                  className={`db-hero-tab${g.id === galpon.id ? ' db-hero-tab--activo' : ''}${g.estado !== 'activo' ? ' db-hero-tab--vacio' : ''}`}
                  onClick={() => seleccionarGalpon(g.id)}
                >
                  <span className={`db-dot db-dot--${est}`} />
                  <span className="db-hero-tab-txt">{g.nombre}</span>
                  <span className="db-hero-tab-code">{g.codigo}</span>
                  {g.sensores.some(s => s.estado === 'critico') && <span className="db-tab-warn">!</span>}
                </button>
              )
            })}
            <button className="db-hero-tab-add" onClick={() => setModalAbierto(true)} title="Agregar galpón">+</button>
          </div>
          <button className="db-hero-btn-nuevo" onClick={() => setModalAbierto(true)}>
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
          <p className="db-hero-vacio">
            {MENSAJE_SIN_LOTE[galpon.estado] ?? 'Este galpón no tiene un lote activo.'}
          </p>
        )}
      </div>

      {/* ── LAYOUT VERTICAL: cada sección con su propio espacio ────────────── */}
      <div ref={contentRef} className="db-grid">

        {/* ① SALUD DEL LOTE — score único de Avisens */}
        {tieneActivo && <SaludBar score={saludScore} />}

        {/* ② GALPÓN 3D — ocupa todo el ancho, grande */}
        <div className="db-col-right">
          {tieneActivo
            ? <CoopPlaceholder galpon={galponFarm} sensores={galpon.sensores} mortalidadPct={mortalidad} pesoKg={pesoKg} />
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

        {/* Sin lote activo */}
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
        galpon={galpon.nombre}
        diaVida={galpon.diaVida}
        onClose={() => setSensorActivo(null)}
      />

      {/* ── Mascota AVIA ─────────────────────────────────────────────────────── */}
      {/* Solo avisa de alertas que el usuario no ha visto todavía en la
          página de Alertas — una vez las mira ahí, AVIA deja de insistir,
          aunque el KPI de arriba siga mostrando el total real. */}
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

      {/* ── Modal agregar galpón ─────────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="db-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="db-modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="db-modal-titulo">Agregar galpón</h2>
            <p className="db-modal-desc">
              Se agrega a <strong>{GRANJAS_DETALLE.find(g => g.id === granjaId)?.nombre}</strong>,
              arranca vacío. Luego le asignas un lote.
            </p>
            <form className="db-modal-form" onSubmit={handleAgregarGalpon}>
              <label className="db-campo">
                <span>Nombre <em>(obligatorio)</em></span>
                <input autoFocus placeholder="Ej: Sur, Norte, Cedro…"
                  value={formGalpon.nombre} onChange={e => setFormGalpon(p => ({ ...p, nombre: e.target.value }))} />
              </label>
              <label className="db-campo">
                <span>Código <em>(opcional)</em></span>
                <input placeholder="Ej: GP-05" value={formGalpon.codigo} maxLength={8}
                  onChange={e => setFormGalpon(p => ({ ...p, codigo: e.target.value }))} />
              </label>
              {errorGalpon && <p className="db-modal-error">{errorGalpon}</p>}
              <div className="db-modal-acciones">
                <button type="button" className="db-btn-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="db-btn-confirmar">Agregar galpón</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fila de sensor compacta (columna izquierda) ──────────────────────────────
type SensorRowProps = { sensor: Sensor; activo: boolean; onClick: () => void }
function SensorRow({ sensor, activo, onClick }: SensorRowProps) {
  const etiqueta: Record<EstadoSensor, string> = {
    optimo: 'Óptimo', advertencia: 'Advertencia', critico: 'Crítico', offline: 'Sin señal',
  }
  return (
    <button
      className={`db-sensor-row db-sensor-row--${sensor.estado}${activo ? ' db-sensor-row--activo' : ''}${sensor.estado !== 'offline' ? ' db-sensor-row--clickable' : ''}`}
      onClick={onClick}
      disabled={sensor.estado === 'offline'}
    >
      <span className="db-sensor-icon">{ICONOS_VARIABLE[sensor.variable]}</span>
      <span className="db-sensor-nombre">{sensor.etiqueta}</span>
      <span className="db-sensor-valor">
        {sensor.estado === 'offline' ? '—' : `${sensor.valor} ${sensor.unidad}`}
      </span>
      <span className={`db-sensor-badge db-sensor-badge--${sensor.estado}`}>
        {etiqueta[sensor.estado]}
      </span>
      {sensor.estado !== 'offline' && <span className="db-sensor-arrow">›</span>}
    </button>
  )
}

// ─── Estado global del galpón (según sus sensores) ─────────────────────────────
function estadoGlobal(g: { diaVida: number; sensores: Sensor[] }): EstadoSensor {
  if (g.diaVida === 0 || g.sensores.length === 0) return 'offline'
  if (g.sensores.some(s => s.estado === 'critico'))     return 'critico'
  if (g.sensores.some(s => s.estado === 'advertencia')) return 'advertencia'
  return 'optimo'
}

export default DashboardPage
