// SensorGauge.tsx — Gauge circular mejorado tipo velocímetro (SVG puro).
//
// Mejoras sobre la versión anterior:
//   · Hueco al fondo (hueco centrado en 6 en punto, como velocímetro real)
//   · Arco con gradiente de color (claro al inicio → pleno al final)
//   · Efecto glow detrás del arco activo (feGaussianBlur)
//   · Marcas de escala en 0%, 25%, 50%, 75%, 100%
//   · Círculo indicador en el extremo del arco (puntero)
//   · Track doble (capa exterior decorativa + pista interna)
//   · Texto central con el valor grande + unidad coloreada
//   · Labels de mín/máx posicionados en los extremos del arco

// ─── Paleta de colores por estado ─────────────────────────────────────────────
// color:      tono principal del arco
// colorLight: versión clara para el inicio del gradiente y el glow
const PALETTE: Record<string, { color: string; colorLight: string }> = {
  optimo:      { color: '#10b981', colorLight: '#6ee7b7' },
  advertencia: { color: '#f59e0b', colorLight: '#fcd34d' },
  critico:     { color: '#ef4444', colorLight: '#fca5a5' },
  offline:     { color: '#9ca3af', colorLight: '#e5e7eb' },
}

// ─── Helpers de geometría SVG ─────────────────────────────────────────────────

// Convierte ángulo (desde las 12 en punto, sentido horario) a coordenadas SVG.
function toXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// Genera el atributo `d` de un arco SVG en sentido horario (sweep=1).
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = toXY(cx, cy, r, startDeg)
  const e = toXY(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

// Clampea un valor entre mín y máx.
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

// Triangulito que apunta hacia afuera del anillo, en el extremo del arco —
// marca que el valor real sigue más allá de lo que el gauge alcanza a dibujar.
function FlechaFueraDeRango({ cx, cy, r, deg, color }: { cx: number; cy: number; r: number; deg: number; color: string }) {
  const tip = toXY(cx, cy, r + 8, deg)
  const b1  = toXY(cx, cy, r - 2, deg - 6)
  const b2  = toXY(cx, cy, r - 2, deg + 6)
  return (
    <path
      d={`M ${tip.x.toFixed(2)},${tip.y.toFixed(2)} L ${b1.x.toFixed(2)},${b1.y.toFixed(2)} L ${b2.x.toFixed(2)},${b2.y.toFixed(2)} Z`}
      fill={color}
    />
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  valor:     number
  minUmbral: number
  maxUmbral: number
  unidad:    string
  estado:    string
  size?:     number   // px — default 220
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function SensorGauge({ valor, minUmbral, maxUmbral, unidad, estado, size = 220 }: Props) {

  // ── Dimensiones ────────────────────────────────────────────────────────────
  const cx = size / 2               // Centro X
  const cy = size * 0.50            // Centro Y — ligeramente arriba del centro visual
  const R  = size * 0.35            // Radio del arco principal
  const TW = size * 0.07            // Ancho del track (pista)

  // ── Ángulos —  GAP AL FONDO (hueco entre 135° y 225° desde 12 en punto)
  // El arco comienza en la posición 7:30 (225°) y termina en 4:30 (135°+360°=495°)
  const START = 225   // ° desde las 12 en punto, sentido horario
  const TOTAL = 270   // ° del arco total

  // ── Porcentaje del valor dentro del rango ───────────────────────────────────
  const rango = maxUmbral - minUmbral
  const pct   = rango > 0
    ? clamp(((valor - minUmbral) / rango) * 100, 0, 100)
    : 50
  const endDeg = START + (pct / 100) * TOTAL

  // Un valor fuera de rango se "clampea" a 0/100% en el arco — sin esto, un
  // sensor que se pasó por poco se ve IGUAL que uno que se disparó muy por
  // encima. Estas banderas activan un indicador extra en el extremo.
  const sobrePasaMax = rango > 0 && valor > maxUmbral
  const sobrePasaMin = rango > 0 && valor < minUmbral

  // ── Colores ─────────────────────────────────────────────────────────────────
  const { color, colorLight } = PALETTE[estado] ?? PALETTE.offline
  const isActive = estado !== 'offline' && pct > 0.5

  // ── Puntos de interés en el arco ────────────────────────────────────────────
  const ptStart   = toXY(cx, cy, R, START)              // Inicio del arco
  const ptFull    = toXY(cx, cy, R, START + TOTAL)      // Fin del arco (máximo)
  const ptValue   = toXY(cx, cy, R, endDeg)             // Posición del valor actual
  const ptStartLbl = toXY(cx, cy, R + TW * 2.0, START)  // Label mínimo
  const ptEndLbl  = toXY(cx, cy, R + TW * 2.0, START + TOTAL) // Label máximo

  // ── Arcos ───────────────────────────────────────────────────────────────────
  const dTrack = arc(cx, cy, R, START, START + TOTAL - 0.3)  // Pista completa
  const dValue = isActive ? arc(cx, cy, R, START, endDeg) : null   // Valor actual

  // ── ID único para los defs SVG (evita conflictos con múltiples gauges) ──────
  const uid = `sg-${estado}-${Math.round(pct)}`

  // ── Marcas de escala (0%, 25%, 50%, 75%, 100%) ──────────────────────────────
  const ticks = [0, 25, 50, 75, 100].map(t => {
    const deg   = START + (t / 100) * TOTAL
    const inner = toXY(cx, cy, R - TW * 0.85, deg)
    const outer = toXY(cx, cy, R + TW * 0.85, deg)
    const isMid = t === 50
    return { deg, inner, outer, isMid }
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-label={`Gauge ${valor} ${unidad}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* ── Gradiente del arco: claro al inicio → pleno al final ─────────── */}
        {/* gradientUnits="userSpaceOnUse" permite anclar en las coords del SVG */}
        <linearGradient
          id={`${uid}-grad`}
          gradientUnits="userSpaceOnUse"
          x1={ptStart.x.toFixed(2)} y1={ptStart.y.toFixed(2)}
          x2={ptFull.x.toFixed(2)}  y2={ptFull.y.toFixed(2)}
        >
          <stop offset="0%"   stopColor={colorLight} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>

        {/* ── Filtro de glow (desenfoque suave detrás del arco) ─────────────── */}
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={TW * 0.6} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Filtro suave solo para la capa de glow (sin la fuente encima) ─── */}
        <filter id={`${uid}-softglow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={TW * 0.9} />
        </filter>
      </defs>

      {/* ── 1. Anillo exterior decorativo ───────────────────────────────────── */}
      <circle
        cx={cx} cy={cy} r={R + TW * 1.05}
        fill="none"
        stroke="rgba(10,26,20,0.04)"
        strokeWidth={1}
      />

      {/* ── 2. Pista del arco (fondo completo 270°) ─────────────────────────── */}
      {/* Capa exterior: ligeramente más ancha, muy baja opacidad */}
      <path
        d={dTrack}
        fill="none"
        stroke="rgba(10,26,20,0.06)"
        strokeWidth={TW + 4}
        strokeLinecap="round"
      />
      {/* Capa interior: la pista principal */}
      <path
        d={dTrack}
        fill="none"
        stroke="rgba(10,26,20,0.08)"
        strokeWidth={TW}
        strokeLinecap="round"
      />

      {/* ── 3. Capa de glow detrás del arco de valor ────────────────────────── */}
      {dValue && (
        <path
          d={dValue}
          fill="none"
          stroke={color}
          strokeWidth={TW * 2.8}
          strokeLinecap="round"
          opacity={0.14}
          filter={`url(#${uid}-softglow)`}
        />
      )}

      {/* ── 4. Arco del valor con gradiente ─────────────────────────────────── */}
      {dValue && (
        <path
          d={dValue}
          fill="none"
          stroke={`url(#${uid}-grad)`}
          strokeWidth={TW}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.3s ease' }}
        />
      )}

      {/* ── 5. Marcas de escala ──────────────────────────────────────────────── */}
      {ticks.map(({ deg, inner, outer, isMid }) => (
        <line
          key={deg}
          x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
          x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
          stroke={isMid ? 'rgba(10,26,20,0.18)' : 'rgba(10,26,20,0.12)'}
          strokeWidth={isMid ? 2 : 1.5}
          strokeLinecap="round"
        />
      ))}

      {/* ── 6. Indicador de posición (círculo en el extremo del arco) ───────── */}
      {isActive && ptValue && (
        <>
          {/* Halo exterior */}
          <circle
            cx={ptValue.x.toFixed(2)} cy={ptValue.y.toFixed(2)}
            r={TW * 0.72}
            fill={color}
            opacity={0.22}
            filter={`url(#${uid}-softglow)`}
          />
          {/* Círculo blanco con borde coloreado */}
          <circle
            cx={ptValue.x.toFixed(2)} cy={ptValue.y.toFixed(2)}
            r={TW * 0.44}
            fill="white"
            stroke={color}
            strokeWidth={2.5}
          />
        </>
      )}

      {/* ── 6b. Fuera de rango: el valor real sigue más allá de lo que dibuja el arco ── */}
      {sobrePasaMax && <FlechaFueraDeRango cx={cx} cy={cy} r={R} deg={START + TOTAL} color={color} />}
      {sobrePasaMin && <FlechaFueraDeRango cx={cx} cy={cy} r={R} deg={START} color={color} />}

      {/* ── 7. Centro del gauge ──────────────────────────────────────────────── */}

      {/* Círculo interior decorativo */}
      <circle
        cx={cx} cy={cy} r={R - TW * 1.1}
        fill="rgba(255,255,255,0.6)"
        stroke="rgba(10,26,20,0.04)"
        strokeWidth={1}
      />

      {/* Valor numérico — grande y bold */}
      {estado !== 'offline' ? (
        <>
          <text
            x={cx} y={cy - size * 0.055}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.195}
            fontWeight="800"
            fill="#0a1a14"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="-1"
          >
            {valor}
          </text>
          {/* Unidad del sensor, coloreada según estado */}
          <text
            x={cx} y={cy + size * 0.115}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.082}
            fontWeight="600"
            fill={color}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {unidad}
          </text>
        </>
      ) : (
        /* Sensor offline */
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.14} fontWeight="700"
          fill="#9ca3af"
          fontFamily="Inter, system-ui, sans-serif"
        >
          —
        </text>
      )}

      {/* ── 8. Labels de mínimo y máximo — se resaltan si el valor real los superó ── */}
      <text
        x={ptStartLbl.x.toFixed(2)} y={(ptStartLbl.y + 4).toFixed(2)}
        textAnchor="end"
        fontSize={size * 0.062}
        fontWeight={sobrePasaMin ? '800' : '600'}
        fill={sobrePasaMin ? color : 'rgba(10,26,20,0.35)'}
        fontFamily="'DM Mono', monospace"
      >
        {minUmbral}
      </text>
      <text
        x={ptEndLbl.x.toFixed(2)} y={(ptEndLbl.y + 4).toFixed(2)}
        textAnchor="start"
        fontSize={size * 0.062}
        fontWeight={sobrePasaMax ? '800' : '600'}
        fill={sobrePasaMax ? color : 'rgba(10,26,20,0.35)'}
        fontFamily="'DM Mono', monospace"
      >
        {maxUmbral}
      </text>

    </svg>
  )
}
