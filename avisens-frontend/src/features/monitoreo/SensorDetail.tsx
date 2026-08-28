// SensorDetail.tsx — Panel lateral con información detallada de un sensor.
// Se abre al tocar/clickear una tarjeta de sensor en MonitoreoPage.
// Muestra: gauge SVG, estadísticas, histórico REAL (vía /mediciones) y
// referencia del Manual Italcol.

import { useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { SensorGauge } from './SensorGauge'
import { listarMediciones, type Medicion } from '@shared/api'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { formatearUltimaLectura, type SensorVista } from '@shared/hooks/useMonitoreoAmbiental'
import { IcNote } from '@shared/ui/icons/icons'
import './SensorDetail.css'

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  sensor:       SensorVista | null   // Sensor actualmente seleccionado (null = cerrado)
  galponNombre: string                // Nombre del galpón al que pertenece el sensor
  diaVida:      number                // Día de vida del lote (para referencia Italcol)
  onClose:      () => void            // Callback para cerrar el panel
}

// A qué clave de referencia corresponde el texto libre de `sensor.tipo`.
function claveReferencia(tipo: string): keyof typeof REFERENCIA_ITALCOL | null {
  const t = tipo.toLowerCase()
  if (t.includes('temp')) return 'temperatura'
  if (t.includes('hum')) return 'humedad'
  if (t.includes('co2') || t.includes('gas')) return 'co2'
  if (t.includes('nh3') || t.includes('amon')) return 'nh3'
  if (t.includes('luz') || t.includes('lum')) return 'luz'
  return null
}

// ─── Referencia del Manual Italcol por variable ───────────────────────────────
const REFERENCIA_ITALCOL = {
  temperatura: {
    descripcion: 'La temperatura crítica para el bienestar del lote — el umbral configurado arriba ya está ajustado a la semana de vida del galpón.',
    rangos: ['Semana 1 (1-7 días): 30–33 °C', 'Semana 2 (8-14 días): 28–30 °C', 'Semana 3 (15-21 días): 26–28 °C', 'Semana 4+ (22+ días): 22–26 °C'],
  },
  humedad: {
    descripcion: 'La humedad relativa afecta directamente la disipación de calor.',
    rangos: ['Toda la vida del lote: 50–70 %', 'Por debajo del 50%: riesgo de polvo y problemas respiratorios', 'Por encima del 70%: amoniaco y patógenos'],
  },
  co2: {
    descripcion: 'El CO₂ es indicador directo de la calidad del aire interior.',
    rangos: ['Óptimo: < 3000 ppm', 'Advertencia: 3000–5000 ppm', 'Crítico: > 5000 ppm'],
  },
  nh3: {
    descripcion: 'El amoniaco (NH₃) causa daño ocular y respiratorio en las aves.',
    rangos: ['Óptimo: < 10 ppm', 'Advertencia: 10–25 ppm', 'Crítico: > 25 ppm — requiere acción inmediata'],
  },
  luz: {
    descripcion: 'La iluminación controla el ciclo de actividad y consumo de alimento.',
    rangos: ['1–5 días: 20–40 lux (continua)', '6+ días: 10–20 lux (programas 23h/1h)', 'Oscuridad: < 1 lux'],
  },
} as const

// ─── Colores por estado ───────────────────────────────────────────────────────
const COLORES: Record<string, string> = {
  optimo:      '#10b981',
  advertencia: '#f59e0b',
  critico:     '#ef4444',
  sin_umbral:  '#64748b',
  offline:     '#a8b8b0',
}

const ETIQUETA_ESTADO: Record<string, string> = {
  optimo:      'Óptimo',
  advertencia: 'Advertencia',
  critico:     'Crítico',
  sin_umbral:  'Sin umbral configurado',
  offline:     'Sin señal',
}

// ─── Gráfico de histórico: línea + banda del rango saludable + hover ─────────
type Lectura = { valor: number; tiempo: string }
type SparkLineProps = {
  datos: Lectura[]; color: string; unidad: string
  min: number; max: number
  umbralMin: number | null; umbralMax: number | null
}
function SparkLine({ datos, color, unidad, min, max, umbralMin, umbralMax }: SparkLineProps) {
  const W = 240; const H = 64
  const PAD_TOP = 8; const PAD_BOT = 8
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const rango = (max - min) || 1
  const yOf = (v: number) => H - PAD_BOT - ((v - min) / rango) * (H - PAD_TOP - PAD_BOT)
  const xOf = (i: number) => datos.length > 1 ? (i / (datos.length - 1)) * W : W / 2

  const puntos = datos.map((d, i) => ({ x: xOf(i), y: yOf(d.valor), ...d }))
  const lineaPts = puntos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `M 0,${H} L ${lineaPts.split(' ').join(' L ')} L ${W},${H} Z`

  const bandTop = umbralMax !== null ? yOf(Math.min(umbralMax, max)) : null
  const bandBot = umbralMin !== null ? yOf(Math.max(umbralMin, min)) : null

  function actualizarHover(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xSvg = ((clientX - rect.left) / rect.width) * W
    let idx = 0; let mejor = Infinity
    puntos.forEach((p, i) => {
      const d = Math.abs(p.x - xSvg)
      if (d < mejor) { mejor = d; idx = i }
    })
    setHoverIdx(idx)
  }

  const activo = hoverIdx ?? datos.length - 1
  const p = puntos[activo]!

  return (
    <div className="sdet-spark-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
        onPointerMove={(e) => actualizarHover(e.clientX)}
        onPointerDown={(e) => actualizarHover(e.clientX)}
        onPointerLeave={() => setHoverIdx(null)}
        style={{ touchAction: 'pan-y' }}
      >
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {bandTop !== null && bandBot !== null && bandBot > bandTop && (
          <rect x="0" y={bandTop} width={W} height={bandBot - bandTop} fill="#10b981" opacity="0.06" />
        )}

        <path d={areaPath} fill="url(#spark-grad)" />
        <polyline points={lineaPts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        <line x1={p.x} y1={PAD_TOP - 2} x2={p.x} y2={H - PAD_BOT + 2}
          stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity={hoverIdx !== null ? 0.5 : 0} />

        <circle cx={p.x} cy={p.y} r={hoverIdx !== null ? 4.5 : 4} fill={color} stroke="white" strokeWidth="2" />
      </svg>

      <div
        className={`sdet-spark-tip${hoverIdx !== null ? ' sdet-spark-tip--flotante' : ''}`}
        style={{ '--tip-x': `${(p.x / W) * 100}%` } as React.CSSProperties}
      >
        <strong>{p.valor} {unidad}</strong>
        <span>{p.tiempo}</span>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SensorDetail({ sensor, galponNombre, diaVida, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [historico, setHistorico] = useState<Medicion[]>([])
  const [cargandoHist, setCargandoHist] = useState(false)

  // Trae el histórico real del sensor cada vez que cambia la selección.
  useEffect(() => {
    if (!sensor) { setHistorico([]); return }
    let activo = true
    setCargandoHist(true)
    listarMediciones({ sensor_id: sensor.id, page: 1, limit: 8 })
      .then((data) => { if (activo) setHistorico(data) })
      .catch((err) => {
        if (activo && !isAxiosError(err)) setHistorico([])
      })
      .finally(() => { if (activo) setCargandoHist(false) })
    return () => { activo = false }
  }, [sensor?.id])

  // El backend manda más reciente primero — se invierte para graficar en orden cronológico.
  const lecturas: Lectura[] = useMemo(
    () => historico
      .slice()
      .reverse()
      .map((m) => ({ valor: m.valor, tiempo: formatearUltimaLectura(new Date(m.fecha_hora).getTime()) })),
    [historico],
  )

  const stats = useMemo(() => {
    if (!lecturas.length) return { min: 0, max: 0, avg: 0 }
    const valores = lecturas.map(h => h.valor)
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    const avg = Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10
    return { min, max, avg }
  }, [lecturas])

  const pctEnRango = sensor && sensor.valor !== null && sensor.minUmbral !== null && sensor.maxUmbral !== null
    ? Math.round(Math.min(100, Math.max(0, ((sensor.valor - sensor.minUmbral) / (sensor.maxUmbral - sensor.minUmbral)) * 100)))
    : 0

  useEffect(() => {
    if (sensor) panelRef.current?.focus()
  }, [sensor?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const ref = sensor ? REFERENCIA_ITALCOL[claveReferencia(sensor.tipo) ?? 'temperatura'] : null
  const refDisponible = sensor ? claveReferencia(sensor.tipo) !== null : false
  const color = sensor ? (COLORES[sensor.estado] ?? COLORES.offline) : COLORES.offline

  return (
    <>
      <div
        className={`sdet-overlay${sensor ? ' sdet-overlay--activo' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        className={`sdet-panel${sensor ? ' sdet-panel--abierto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={sensor ? `Detalle de ${sensor.tipo}` : 'Detalle de sensor'}
      >
        {!sensor ? null : (
          <>
            <div className="sdet-header">
              <div className="sdet-header-info">
                <span className="sdet-icono" style={{ background: `${color}1f`, color }}>
                  {iconoSensor(sensor.tipo, 18)}
                </span>
                <div>
                  <div className="sdet-titulo">{sensor.tipo}</div>
                  <div className="sdet-subtitulo">{galponNombre} · {sensor.codigo}</div>
                </div>
              </div>
              <button className="sdet-cerrar" onClick={onClose} aria-label="Cerrar panel">
                ✕
              </button>
            </div>

            <div className="sdet-gauge-wrap">
              <SensorGauge
                valor={sensor.valor ?? 0}
                minUmbral={sensor.minUmbral ?? 0}
                maxUmbral={sensor.maxUmbral ?? (sensor.valor ?? 1) * 2}
                unidad={sensor.unidad}
                estado={sensor.estado === 'sin_umbral' ? 'optimo' : sensor.estado}
                size={200}
              />

              <div className="sdet-estado-wrap">
                <span
                  className="sdet-estado-badge"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                >
                  {ETIQUETA_ESTADO[sensor.estado]}
                </span>
              </div>

              <p className="sdet-estado-desc">
                {sensor.estado === 'optimo'      && `Dentro del rango óptimo · ${pctEnRango}% del recorrido`}
                {sensor.estado === 'advertencia' && `Fuera del umbral recomendado · Monitorear de cerca`}
                {sensor.estado === 'critico'     && `¡Fuera del rango crítico! Requiere acción correctiva`}
                {sensor.estado === 'sin_umbral'  && `Esta variable todavía no tiene un umbral configurado en el sistema`}
                {sensor.estado === 'offline'     && `Sensor sin señal · Verificar conexión del dispositivo`}
              </p>
            </div>

            <div className="sdet-stats">
              <div className="sdet-stat">
                <span className="sdet-stat-label">Mínimo</span>
                <strong className="sdet-stat-val">{lecturas.length ? stats.min : '—'} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Promedio</span>
                <strong className="sdet-stat-val">{lecturas.length ? stats.avg : '—'} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Máximo</span>
                <strong className="sdet-stat-val">{lecturas.length ? stats.max : '—'} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Última lectura</span>
                <strong className="sdet-stat-val sdet-stat-mono">{formatearUltimaLectura(sensor.ultimaLecturaTs)}</strong>
              </div>
            </div>

            {sensor.minUmbral !== null && sensor.maxUmbral !== null && (
              <div className="sdet-rango-card">
                <span className="sdet-rango-label">Rango umbral configurado</span>
                <div className="sdet-rango-bar-wrap">
                  <div className="sdet-rango-bar">
                    <div className="sdet-rango-fill" style={{ width: `${pctEnRango}%`, background: color }} />
                    <div className="sdet-rango-marker" style={{ left: `${pctEnRango}%`, borderColor: color }} />
                  </div>
                  <div className="sdet-rango-labels">
                    <span>{sensor.minUmbral} {sensor.unidad}</span>
                    <span className="sdet-rango-actual" style={{ color }}>{sensor.valor ?? '—'} {sensor.unidad}</span>
                    <span>{sensor.maxUmbral} {sensor.unidad}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="sdet-section">
              <h3 className="sdet-section-title">Últimas lecturas</h3>
              {cargandoHist ? (
                <p className="sdet-spark-hint">Cargando histórico…</p>
              ) : lecturas.length === 0 ? (
                <p className="sdet-spark-hint">Todavía no hay mediciones registradas para este sensor.</p>
              ) : (
                <>
                  <p className="sdet-spark-hint">Pasa el dedo o el mouse sobre el gráfico para ver cada lectura</p>
                  <div className="sdet-spark">
                    <SparkLine
                      datos={lecturas}
                      color={color}
                      unidad={sensor.unidad}
                      min={stats.min - (stats.max - stats.min) * 0.1}
                      max={stats.max + (stats.max - stats.min) * 0.1}
                      umbralMin={sensor.minUmbral}
                      umbralMax={sensor.maxUmbral}
                    />
                  </div>
                </>
              )}
            </div>

            {ref && refDisponible && (
              <div className="sdet-section sdet-italcol">
                <h3 className="sdet-section-title">
                  <IcNote size={14} /> Manual Italcol · Día de vida {diaVida}
                </h3>
                <p className="sdet-italcol-desc">{ref.descripcion}</p>
                <ul className="sdet-italcol-lista">
                  {ref.rangos.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}
