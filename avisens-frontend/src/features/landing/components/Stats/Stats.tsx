import { useEffect, useRef, useState } from 'react'
import './Stats.css'

function Ctr({ end, suffix = '', dur = 1600 }: { end: number; suffix?: string; dur?: number }) {
  const [v, setV] = useState(0)
  const decimals = Number.isInteger(end) ? 0 : 1
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const t0 = performance.now()
          const tick = (t: number) => {
            const p = Math.min((t - t0) / dur, 1)
            const e2 = 1 - Math.pow(1 - p, 3)
            setV(Number((e2 * end).toFixed(decimals)))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [end, dur])

  return (
    <span ref={ref}>
      {v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

function Stats() {
  const stats = [
    {
      n: 340,
      s: '+',
      l: 'Granjas activas',
      d: 'Granjas avícolas en Colombia y la región operan hoy con AVISENS.',
    },
    {
      n: 4200000,
      s: '',
      l: 'Aves monitoreadas',
      d: 'Aves bajo seguimiento continuo en distintos lotes y galpones.',
    },
    {
      n: 99.7,
      s: '%',
      l: 'Uptime garantizado',
      d: 'Disponibilidad del sistema — tus lecturas siempre accesibles.',
    },
    {
      n: 8,
      s: 'x',
      l: 'Retorno de inversión',
      d: 'Promedio medido en producción ganada y pérdidas evitadas.',
    },
  ]

  return (
    <section className="stats-section" id="cifras">
      <div className="stats-head">
        <div className="stats-eyebrow">
          <span className="stats-eyebrow-line" />
          <span className="stats-eyebrow-txt">AVISENS en cifras</span>
          <span className="stats-eyebrow-line" />
        </div>
        <h2 className="stats-title">
          Resultados reales en granjas reales.
        </h2>
      </div>

      <ul className="stats-grid">
        {stats.map(({ n, s, l, d }, index) => (
          <li key={l} className="stat-card">
            <span className="stat-card-index">0{index + 1}</span>
            <div className="stat-card-num">
              <Ctr end={n} suffix={s} />
            </div>
            <div className="stat-card-label">{l}</div>
            <p className="stat-card-desc">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Stats
