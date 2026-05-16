import './Farm3D.css'

interface Galpon {
  id: number
  x: number
  y: number
  w: number
  h: number
  score: number
  color: string
  label: string
  status: 'ok' | 'warn' | 'crit'
  sensors: Array<{ x: number; y: number; c: string }>
}

const galpones: Galpon[] = [
  { id: 1, x: 40, y: 30, w: 160, h: 80, score: 94, color: '#10b981', label: 'G1', status: 'ok', sensors: [{ x: 30, y: 25, c: '#10b981' }, { x: 130, y: 50, c: '#10b981' }] },
  { id: 2, x: 230, y: 20, w: 160, h: 80, score: 71, color: '#f59e0b', label: 'G2', status: 'warn', sensors: [{ x: 40, y: 30, c: '#f59e0b' }, { x: 120, y: 55, c: '#f59e0b' }] },
  { id: 3, x: 40, y: 155, w: 160, h: 80, score: 97, color: '#10b981', label: 'G3', status: 'ok', sensors: [{ x: 25, y: 35, c: '#10b981' }, { x: 135, y: 20, c: '#10b981' }] },
  { id: 4, x: 230, y: 155, w: 160, h: 80, score: 48, color: '#ef4444', label: 'G4', status: 'crit', sensors: [{ x: 30, y: 30, c: '#ef4444' }, { x: 120, y: 45, c: '#ef4444' }] },
]

function Farm3D() {
  return (
    <section className="farm-section" id="vista-granja">
      <svg className="farm-wave" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="farmWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="25%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="farmWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#a7f3d0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          className="farm-wave-path farm-wave-1"
          d="M0,140 C240,60 480,220 720,140 C960,60 1200,220 1440,140"
          fill="none"
          stroke="url(#farmWaveGrad)"
          strokeWidth="1.5"
        />
        <path
          className="farm-wave-path farm-wave-2"
          d="M0,150 C240,90 480,210 720,150 C960,90 1200,210 1440,150"
          fill="none"
          stroke="url(#farmWaveGrad2)"
          strokeWidth="1"
        />
        <path
          className="farm-wave-path farm-wave-3"
          d="M0,130 C300,180 600,80 900,150 C1100,200 1300,100 1440,140"
          fill="none"
          stroke="rgba(16,185,129,0.25)"
          strokeWidth="0.8"
          strokeDasharray="3 6"
        />
        <circle className="farm-wave-dot" r="4" fill="#a7f3d0">
          <animateMotion
            dur="9s"
            repeatCount="indefinite"
            path="M0,140 C240,60 480,220 720,140 C960,60 1200,220 1440,140"
          />
        </circle>
      </svg>

      <div className="farm-section-head">
        <span className="farm-section-tag">
          <span className="farm-tag-dot" />
          Vista en tiempo real
        </span>
        <h2 className="farm-section-title">
          Tu granja completa, <span className="farm-gradient-text">en una pantalla</span>
        </h2>
        <p className="farm-section-sub">
          Cada galpón se actualiza solo. Los sensores envían datos cada minuto y el Health Score recalcula la salud del lote sin que muevas un dedo.
        </p>
      </div>

      <div className="farm-scene-wrap">
        <div className="farm-scene-inner">
          <div className="float-metric float-metric-tr">
            <div className="fm-label">Health Score</div>
            <div className="fm-val" style={{ color: '#10b981' }}>
              94<span className="fm-unit">/100</span>
            </div>
            <div className="fm-sub">Galpón 1 · Óptimo</div>
          </div>
          <div className="float-metric float-metric-bl">
            <div className="fm-label">Temperatura</div>
            <div className="fm-val" style={{ color: '#10b981' }}>22°C</div>
            <div className="fm-sub">✓ Rango óptimo</div>
          </div>
          <div className="float-metric float-metric-tl">
            <div className="fm-label">FCR</div>
            <div className="fm-val" style={{ color: '#10b981' }}>1.64</div>
            <div className="fm-sub">↑ Mejor que objetivo 1.65</div>
          </div>
          <div className="float-metric float-metric-br">
            <div className="fm-label">Aves activas</div>
            <div className="fm-val">59,500</div>
            <div className="fm-sub">4 galpones</div>
          </div>

          <div className="farm-mask-wrap">
            <div className="farm-perspective">
              <div className="farm-plane">
                <div className="farm-scan-line" />
                {galpones.map((g) => (
                  <div
                    key={g.id}
                    className={`galpon galpon-${g.status}`}
                    style={{ left: g.x, top: g.y, width: g.w, height: g.h, animationDelay: `${g.id * 0.2}s` }}
                  >
                    <div className="galpon-body" style={{ borderColor: `${g.color}66` }}>
                      <div className="galpon-grid" />
                      <div className="galpon-score" style={{ color: g.color }}>
                        {g.score}
                      </div>
                      <div className="galpon-label">
                        {g.label} · {g.status === 'crit' ? '⚠ CRÍTICO' : g.status === 'warn' ? '⚡ Atención' : '✓ Óptimo'}
                      </div>
                    </div>
                    {g.sensors.map((s, si) => (
                      <div key={si} className="sensor-wrap" style={{ left: s.x, top: s.y }}>
                        <div className="sensor-dot" style={{ background: s.c, boxShadow: `0 0 10px ${s.c}` }} />
                        <div className="sensor-ping" style={{ background: s.c, animationDelay: `${si * 0.5}s` }} />
                      </div>
                    ))}
                  </div>
                ))}
                <div className="data-line data-line-h-top" />
                <div className="data-line data-line-v-left" />
                <div className="data-line data-line-v-right" />
                <div className="data-line data-line-h-bottom" />
              </div>
            </div>
          </div>
        </div>
        <div className="farm-foot">
          <span className="farm-foot-dot" />
          Vista en tiempo real · 4 galpones monitoreados · IoT activo
        </div>
      </div>
    </section>
  )
}

export default Farm3D
