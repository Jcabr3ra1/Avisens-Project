type Point = [number, number]

function buildPath(data: number[], w: number, h: number, padBottom = 0): Point[] {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  return data.map((v, i) => {
    const x = i * step
    const y = h - padBottom - ((v - min) / range) * (h - padBottom - 2) - 1
    return [x, y]
  })
}

type SparklineProps = {
  data: number[]
  w?: number
  h?: number
  color?: string
  fill?: string
}

export const Sparkline = ({
  data,
  w = 200,
  h = 50,
  color = '#10b981',
  fill = 'rgba(16, 185, 129, 0.18)',
}: SparklineProps) => {
  const pts = buildPath(data, w, h, 0)
  const d = 'M' + pts.map((p) => p.join(',')).join(' L')
  const fillD = d + ` L${w},${h} L0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: h, maxWidth: '100%' }}>
      <path d={fillD} fill={fill} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

type BarChartProps = {
  data: number[]
  w?: number
  h?: number
  color?: string
  labels?: string[]
  yTicks?: number[]
}

export const BarChart = ({
  data,
  w = 320,
  h = 110,
  color = '#10b981',
  labels = ['00:00', '06:00', '12:00', '18:00', '24:00'],
  yTicks = [0, 10, 20, 30, 40],
}: BarChartProps) => {
  const max = Math.max(...data, ...yTicks)
  const padL = 30,
    padB = 22,
    padT = 4,
    padR = 4
  const innerW = w - padL - padR
  const innerH = h - padB - padT
  const bw = (innerW / data.length) * 0.62
  const gap = innerW / data.length
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}>
      {yTicks.map((t, i) => {
        const y = padT + innerH - (t / max) * innerH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10, 26, 20, 0.06)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="9" fill="#a8b8b0" textAnchor="end" fontFamily="DM Mono, monospace">
              {t}
            </text>
          </g>
        )
      })}
      {data.map((v, i) => {
        const x = padL + i * gap + (gap - bw) / 2
        const bh = (v / max) * innerH
        const y = padT + innerH - bh
        return <rect key={i} x={x} y={y} width={bw} height={bh} rx="1.5" fill={color} opacity="0.85" />
      })}
      {labels.map((l, i) => (
        <text
          key={i}
          x={padL + (i / (labels.length - 1)) * innerW}
          y={h - 6}
          fontSize="9"
          fill="#a8b8b0"
          textAnchor="middle"
          fontFamily="DM Mono, monospace"
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

type LineChartProps = {
  data: number[]
  w?: number
  h?: number
  color?: string
  yTicks?: number[]
  labels?: string[]
  unit?: string
}

export const LineChart = ({
  data,
  w = 360,
  h = 150,
  color = '#ef4444',
  yTicks = [20, 25, 30, 35],
  labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
  unit = '°C',
}: LineChartProps) => {
  const max = Math.max(...yTicks, ...data)
  const min = Math.min(...yTicks, ...data)
  const padL = 36,
    padB = 22,
    padT = 8,
    padR = 8
  const innerW = w - padL - padR
  const innerH = h - padB - padT
  const step = innerW / (data.length - 1)
  const pts = data.map<Point>((v, i) => [padL + i * step, padT + innerH - ((v - min) / (max - min)) * innerH])
  const d = 'M' + pts.map((p) => p.join(',')).join(' L')
  const fillD = d + ` L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`
  const gradId = 'lineGrad-' + color.replace(/[^a-z0-9]/gi, '')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => {
        const y = padT + innerH - ((t - min) / (max - min)) * innerH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10, 26, 20, 0.06)" strokeWidth="1" />
            <text x={padL - 8} y={y + 3} fontSize="9.5" fill="#a8b8b0" textAnchor="end" fontFamily="DM Mono, monospace">
              {t}
              {unit}
            </text>
          </g>
        )
      })}
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (i % 3 === 0 ? <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} /> : null))}
      {labels.map((l, i) => (
        <text
          key={i}
          x={padL + (i / (labels.length - 1)) * innerW}
          y={h - 6}
          fontSize="9"
          fill="#a8b8b0"
          textAnchor="middle"
          fontFamily="DM Mono, monospace"
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

type AreaChartProps = {
  data: number[]
  w?: number
  h?: number
  color?: string
  yTicks?: number[]
  labels?: string[]
}

export const AreaChart = ({
  data,
  w = 320,
  h = 110,
  color = '#10b981',
  yTicks = [0, 100, 200, 300],
  labels = ['00:00', '06:00', '12:00', '18:00', '24:00'],
}: AreaChartProps) => {
  const max = Math.max(...yTicks, ...data)
  const padL = 30,
    padB = 22,
    padT = 4,
    padR = 4
  const innerW = w - padL - padR
  const innerH = h - padB - padT
  const step = innerW / (data.length - 1)
  const pts = data.map<Point>((v, i) => [padL + i * step, padT + innerH - (v / max) * innerH])
  const d = 'M' + pts.map((p) => p.join(',')).join(' L')
  const fillD = d + ` L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`
  const gradId = 'areaGrad-' + color.replace(/[^a-z0-9]/gi, '')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.36" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => {
        const y = padT + innerH - (t / max) * innerH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10, 26, 20, 0.05)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="9" fill="#a8b8b0" textAnchor="end" fontFamily="DM Mono, monospace">
              {t}
            </text>
          </g>
        )
      })}
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((l, i) => (
        <text
          key={i}
          x={padL + (i / (labels.length - 1)) * innerW}
          y={h - 6}
          fontSize="9"
          fill="#a8b8b0"
          textAnchor="middle"
          fontFamily="DM Mono, monospace"
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

type RadialGaugeProps = {
  value?: number
  max?: number
  size?: number
  color?: string
  track?: string
}

export const RadialGauge = ({
  value = 60,
  max = 100,
  size = 72,
  color = '#0a1a14',
  track = 'rgba(10, 26, 20, 0.08)',
}: RadialGaugeProps) => {
  const r = size / 2 - 6
  const c = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth="6" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${circ * pct} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
    </svg>
  )
}
