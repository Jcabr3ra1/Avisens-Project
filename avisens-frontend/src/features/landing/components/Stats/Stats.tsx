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
    { n: 340, s: '+', l: 'Granjas activas' },
    { n: 4200000, s: '', l: 'Aves monitoreadas' },
    { n: 99.7, s: '%', l: 'Uptime garantizado' },
    { n: 8, s: 'x', l: 'Retorno de inversión' },
  ]

  return (
    <div className="stats-wrap">
      <div className="stats-bar">
        {stats.map(({ n, s, l }, index) => (
          <div key={l} className="stat-item" data-index={`0${index + 1}`}>
            <div className="stat-num">
              <Ctr end={n} suffix={s} />
            </div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Stats
