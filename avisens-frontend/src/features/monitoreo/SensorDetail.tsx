// SensorDetail.tsx — Panel lateral con información detallada de un sensor.
// Se abre al tocar/clickear una tarjeta de sensor en MonitoreoPage.
// Muestra: gauge SVG, estadísticas, histórico y referencia Manual Italcol.

import { useEffect, useMemo, useRef, useState } from 'react'
import { SensorGauge } from './SensorGauge'
import type { Sensor } from './data'
import { ICONOS_VARIABLE } from './data'
import { IcNote } from '@shared/ui/icons/icons'
import './SensorDetail.css'

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  sensor:   Sensor | null   // Sensor actualmente seleccionado (null = cerrado)
  galpon:   string          // Nombre del galpón al que pertenece el sensor
  diaVida:  number          // Día de vida del lote (para referencia Italcol)
  onClose:  () => void      // Callback para cerrar el panel
}

// ─── Referencia del Manual Italcol por variable ───────────────────────────────
// Valores estándar de referencia para pollos de engorde Ross 308
const REFERENCIA_ITALCOL: Record<string, { descripcion: string; rangos: string[] }> = {
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
}

// ─── Colores por estado ───────────────────────────────────────────────────────
const COLORES: Record<string, string> = {
  optimo:      '#10b981',
  advertencia: '#f59e0b',
  critico:     '#ef4444',
  offline:     '#a8b8b0',
}

// ─── Genera lecturas históricas simuladas ────────────────────────────────────
// Crea 7 lecturas anteriores (cada 3 min) con variación alrededor del valor
// actual. Usa el ID del sensor como semilla para que sean deterministas
// (no cambian en cada render).
type Lectura = { valor: number; tiempo: string }
function generarHistorico(sensor: Sensor): Lectura[] {
  const valores: number[] = []
  // Semilla simple basada en el ID del sensor
  let seed = sensor.id.charCodeAt(0) + sensor.id.charCodeAt(sensor.id.length - 1)

  // Pseudo-random determinista (LCG simple)
  function rand(): number {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return ((seed >>> 0) / 0xffffffff) - 0.5
  }

  let v = sensor.valor
  for (let i = 0; i < 7; i++) {
    // Varía ±4% alrededor del valor actual
    v = Math.round((v + rand() * sensor.valor * 0.04) * 10) / 10
    valores.unshift(v)
  }
  // La última lectura siempre es el valor actual
  valores.push(sensor.valor)

  // Lecturas cada 3 min, terminando en "Ahora" (la actual)
  return valores.map((valor, i) => {
    const minAtras = (valores.length - 1 - i) * 3
    return { valor, tiempo: minAtras === 0 ? 'Ahora' : `hace ${minAtras} min` }
  })
}

// ─── Gráfico de histórico: línea + banda del rango saludable + hover ─────────
// Un solo punto se etiqueta de forma permanente (el actual); el resto se
// consulta pasando el mouse/dedo — no se listan los 8 valores como texto fijo.
type SparkLineProps = {
  datos: Lectura[]; color: string; unidad: string
  min: number; max: number          // dominio del eje Y (con margen)
  umbralMin: number; umbralMax: number  // banda del rango saludable configurado
}
function SparkLine({ datos, color, unidad, min, max, umbralMin, umbralMax }: SparkLineProps) {
  const W = 240; const H = 64
  const PAD_TOP = 8; const PAD_BOT = 8
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const rango = (max - min) || 1
  const yOf = (v: number) => H - PAD_BOT - ((v - min) / rango) * (H - PAD_TOP - PAD_BOT)
  const xOf = (i: number) => (i / (datos.length - 1)) * W

  const puntos = datos.map((d, i) => ({ x: xOf(i), y: yOf(d.valor), ...d }))
  const lineaPts = puntos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `M 0,${H} L ${lineaPts.split(' ').join(' L ')} L ${W},${H} Z`

  // Banda del rango saludable, recortada al dominio visible del eje Y
  const bandTop = yOf(Math.min(umbralMax, max))
  const bandBot = yOf(Math.max(umbralMin, min))

  // Ubica el punto más cercano al puntero (funciona con mouse y touch)
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

        {/* Banda del rango saludable configurado — referencia neutra, no la línea */}
        {bandBot > bandTop && (
          <rect x="0" y={bandTop} width={W} height={bandBot - bandTop} fill="#10b981" opacity="0.06" />
        )}

        {/* Relleno degradado bajo la línea */}
        <path d={areaPath} fill="url(#spark-grad)" />

        {/* Línea de tendencia */}
        <polyline points={lineaPts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Cruce vertical del punto activo (hover o el actual por defecto) */}
        <line x1={p.x} y1={PAD_TOP - 2} x2={p.x} y2={H - PAD_BOT + 2}
          stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity={hoverIdx !== null ? 0.5 : 0} />

        {/* Punto activo */}
        <circle cx={p.x} cy={p.y} r={hoverIdx !== null ? 4.5 : 4} fill={color} stroke="white" strokeWidth="2" />
      </svg>

      {/* Tooltip flotante — sigue al punto activo; clamp() en CSS evita que se salga del borde */}
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
export function SensorDetail({ sensor, galpon, diaVida, onClose }: Props) {
  // Referencia al panel para el foco de accesibilidad
  const panelRef = useRef<HTMLDivElement>(null)

  // Genera el histórico solo cuando el sensor cambia (no en cada render)
  const historico = useMemo(
    () => sensor ? generarHistorico(sensor) : [],
    [sensor?.id, sensor?.valor],
  )

  // Estadísticas derivadas del histórico
  const stats = useMemo(() => {
    if (!historico.length) return { min: 0, max: 0, avg: 0 }
    const valores = historico.map(h => h.valor)
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    const avg = Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10
    return { min, max, avg }
  }, [historico])

  // Porcentaje del valor dentro del rango óptimo (para el texto de resumen)
  const pctEnRango = sensor && sensor.estado !== 'offline'
    ? Math.round(Math.min(100, Math.max(0, ((sensor.valor - sensor.minUmbral) / (sensor.maxUmbral - sensor.minUmbral)) * 100)))
    : 0

  // Mover el foco al panel cuando abre (accesibilidad)
  useEffect(() => {
    if (sensor) panelRef.current?.focus()
  }, [sensor?.id])

  // Cerrar con Escape — ya lo maneja MonitoreoPage pero por si acaso
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Referencia del Manual Italcol para esta variable
  const ref = sensor ? REFERENCIA_ITALCOL[sensor.variable] : null
  const color = sensor ? (COLORES[sensor.estado] ?? COLORES.offline) : COLORES.offline

  // Etiqueta del estado
  const etiquetaEstado: Record<string, string> = {
    optimo:      'Óptimo',
    advertencia: 'Advertencia',
    critico:     'Crítico',
    offline:     'Sin señal',
  }

  return (
    <>
      {/* ── Overlay oscuro detrás del panel ─────────────────────────────── */}
      <div
        className={`sdet-overlay${sensor ? ' sdet-overlay--activo' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel lateral ────────────────────────────────────────────────── */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={`sdet-panel${sensor ? ' sdet-panel--abierto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={sensor ? `Detalle de ${sensor.etiqueta}` : 'Detalle de sensor'}
      >
        {!sensor ? null : (
          <>
            {/* ── Cabecera del panel ───────────────────────────────────────── */}
            <div className="sdet-header">
              <div className="sdet-header-info">
                <span className="sdet-icono" style={{ background: `${color}1f`, color }}>
                  {ICONOS_VARIABLE[sensor.variable]}
                </span>
                <div>
                  <div className="sdet-titulo">{sensor.etiqueta}</div>
                  <div className="sdet-subtitulo">{galpon} · Zona {sensor.zona}</div>
                </div>
              </div>
              <button className="sdet-cerrar" onClick={onClose} aria-label="Cerrar panel">
                ✕
              </button>
            </div>

            {/* ── Gauge principal ──────────────────────────────────────────── */}
            <div className="sdet-gauge-wrap">
              <SensorGauge
                valor={sensor.valor}
                minUmbral={sensor.minUmbral}
                maxUmbral={sensor.maxUmbral}
                unidad={sensor.unidad}
                estado={sensor.estado}
                size={200}
              />

              {/* Badge de estado centrado bajo el gauge */}
              <div className="sdet-estado-wrap">
                <span
                  className="sdet-estado-badge"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {etiquetaEstado[sensor.estado]}
                </span>
              </div>

              {/* Descripción rápida del estado */}
              <p className="sdet-estado-desc">
                {sensor.estado === 'optimo'      && `Dentro del rango óptimo · ${pctEnRango}% del recorrido`}
                {sensor.estado === 'advertencia' && `Fuera del umbral recomendado · Monitorear de cerca`}
                {sensor.estado === 'critico'     && `¡Fuera del rango crítico! Requiere acción correctiva`}
                {sensor.estado === 'offline'     && `Sensor sin señal · Verificar conexión del dispositivo`}
              </p>
            </div>

            {/* ── Tarjetas de estadísticas ─────────────────────────────────── */}
            <div className="sdet-stats">
              <div className="sdet-stat">
                <span className="sdet-stat-label">Mínimo</span>
                <strong className="sdet-stat-val">{stats.min} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Promedio</span>
                <strong className="sdet-stat-val">{stats.avg} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Máximo</span>
                <strong className="sdet-stat-val">{stats.max} <small>{sensor.unidad}</small></strong>
              </div>
              <div className="sdet-stat">
                <span className="sdet-stat-label">Última lectura</span>
                <strong className="sdet-stat-val sdet-stat-mono">{sensor.ultimaLectura}</strong>
              </div>
            </div>

            {/* ── Rango configurado ────────────────────────────────────────── */}
            <div className="sdet-rango-card">
              <span className="sdet-rango-label">Rango umbral configurado</span>
              <div className="sdet-rango-bar-wrap">
                {/* Barra del rango con marcador del valor actual */}
                <div className="sdet-rango-bar">
                  <div
                    className="sdet-rango-fill"
                    style={{ width: `${pctEnRango}%`, background: color }}
                  />
                  <div
                    className="sdet-rango-marker"
                    style={{ left: `${pctEnRango}%`, borderColor: color }}
                  />
                </div>
                <div className="sdet-rango-labels">
                  <span>{sensor.minUmbral} {sensor.unidad}</span>
                  <span className="sdet-rango-actual" style={{ color }}>
                    {sensor.valor} {sensor.unidad}
                  </span>
                  <span>{sensor.maxUmbral} {sensor.unidad}</span>
                </div>
              </div>
            </div>

            {/* ── Histórico de lecturas ────────────────────────────────────── */}
            <div className="sdet-section">
              <h3 className="sdet-section-title">Últimas lecturas</h3>
              <p className="sdet-spark-hint">Pasa el dedo o el mouse sobre el gráfico para ver cada lectura</p>
              <div className="sdet-spark">
                <SparkLine
                  datos={historico}
                  color={color}
                  unidad={sensor.unidad}
                  min={stats.min - (stats.max - stats.min) * 0.1}
                  max={stats.max + (stats.max - stats.min) * 0.1}
                  umbralMin={sensor.minUmbral}
                  umbralMax={sensor.maxUmbral}
                />
              </div>
            </div>

            {/* ── Referencia Manual Italcol ────────────────────────────────── */}
            {ref && (
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
