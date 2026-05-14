import { useFadeUp } from '@shared/hooks/useFadeUp'
import Ic from '@shared/ui/Ic/Ic'
import './HealthScore.css'

const score = 87
const r = 100
const c = 2 * Math.PI * r

const metrics = [
  { n: 'Temperatura', v: '22°C', p: 92, col: '#10b981' },
  { n: 'Humedad', v: '65%', p: 88, col: '#10b981' },
  { n: 'CO₂', v: '2,200ppm', p: 85, col: '#10b981' },
  { n: 'NH₃', v: '18 ppm', p: 78, col: '#f59e0b' },
  { n: 'Crecimiento', v: '+2.1%', p: 91, col: '#10b981' },
  { n: 'Mortalidad', v: '0.8%', p: 94, col: '#10b981' },
]

const bullets = [
  { r: '90–100', l: 'Excelente — condiciones perfectas para el crecimiento', c: '#10b981' },
  { r: '70–89', l: 'Bueno — monitoreo de rutina, sin acciones urgentes', c: '#f59e0b' },
  { r: '50–69', l: 'Atención — revisar variables fuera de rango inmediatamente', c: '#f59e0b' },
  { r: '0–49', l: 'Crítico — acción inmediata + alerta automática WhatsApp', c: '#ef4444' },
]

function HealthScore() {
  const ref = useFadeUp()

  return (
    <section id="health">
      <div className="health-inner fade-up" ref={ref}>
        <div className="score-visual">
          <div className="score-ring-wrap">
            <svg viewBox="0 0 260 260">
              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(232,160,32,.2)" strokeWidth="10" />
              <circle
                cx="130"
                cy="130"
                r={r}
                fill="none"
                stroke="url(#sg)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (score / 100) * c}
                style={{ transformOrigin: '130px 130px', transform: 'rotate(-90deg)' }}
              />
            </svg>
            <div className="score-center">
              <div className="score-num">{score}</div>
              <div className="score-tag">HEALTH SCORE™</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '0.2rem' }}>Galpón 1 · Bueno</div>
            </div>
          </div>
          <div className="health-metrics">
            {metrics.map(({ n, v, p, col }) => (
              <div key={n} className="hm">
                <div className="hm-name">{n}</div>
                <div className="hm-bar">
                  <div className="hm-fill" style={{ width: `${p}%`, background: col }} />
                </div>
                <div className="hm-val" style={{ color: col }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-label">Health Score™</div>
          <h2 className="section-title">
            Un solo número.
            <br />
            Todo el estado
            <br />
            de tu granja.
          </h2>
          <p className="section-sub">
            El diferenciador único de AVISENS: un algoritmo que combina temperatura, humedad, CO₂, amoníaco, crecimiento y mortalidad en un número de 0 a 100. Ningún competidor en LATAM lo tiene.
          </p>
          <div className="hbullets">
            {bullets.map(({ r: rng, l, c }) => (
              <div key={rng} className="hbullet">
                <div className="hb-dot" style={{ background: `${c}18`, border: `1px solid ${c}40` }}>
                  <Ic d="M20 6L9 17l-5-5" size={10} style={{ color: '#10b981' }} />
                </div>
                <span>
                  <strong style={{ color: c, fontFamily: 'DM Mono', fontSize: '0.78rem' }}>{rng}</strong> — {l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HealthScore
