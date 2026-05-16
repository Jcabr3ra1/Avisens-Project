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
      <div className="farm-grid">
        <header className="farm-head">
          <div className="farm-eyebrow">
            <span className="farm-eyebrow-num">01</span>
            <span className="farm-eyebrow-line" />
            <span className="farm-eyebrow-txt">Telemetría en vivo</span>
          </div>
          <h2 className="farm-title">
            <span className="farm-title-l1">La granja,</span>
            <span className="farm-title-l2"><em>auscultada</em></span>
            <span className="farm-title-l3">minuto a minuto.</span>
          </h2>
          <p className="farm-lede">
            Cuatro galpones. Doce sensores por galpón. Una sola lectura. AVISENS toma el pulso del lote y lo traduce a una calificación clínica del estado de tus aves.
          </p>
          <div className="farm-stamp">
            <span className="farm-stamp-label">índice clínico — G1</span>
            <span className="farm-stamp-num">94</span>
            <span className="farm-stamp-deno">/100</span>
            <span className="farm-stamp-status">· óptimo</span>
          </div>
        </header>

        <div className="farm-stage">
          <div className="farm-glow" aria-hidden="true" />

          <svg className="farm-sketch" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="farmSketchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="20%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="80%" stopColor="#34d399" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="farm-sketch-path"
              d="M-20,200 C90,160 150,260 240,210 S380,140 470,200 S620,260 720,180 L820,180"
              fill="none"
              stroke="url(#farmSketchGrad)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              className="farm-sketch-path-2"
              d="M-20,220 C90,180 150,280 240,230 S380,160 470,220 S620,280 720,200 L820,200"
              fill="none"
              stroke="rgba(16,185,129,0.22)"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeDasharray="2 5"
            />
            <circle r="3.5" fill="#34d399" className="farm-sketch-dot">
              <animateMotion
                dur="11s"
                repeatCount="indefinite"
                rotate="auto"
                path="M-20,200 C90,160 150,260 240,210 S380,140 470,200 S620,260 720,180 L820,180"
              />
            </circle>
          </svg>

          <div className="farm-perspective">
            <div className="farm-plane">
              <div className="farm-scan" />
              {galpones.map((g) => (
                <div
                  key={g.id}
                  className={`galpon galpon-${g.status}`}
                  style={{ left: g.x, top: g.y, width: g.w, height: g.h, animationDelay: `${g.id * 0.18}s` }}
                >
                  <div className="galpon-body" style={{ borderColor: `${g.color}88` }}>
                    <div className="galpon-floor" />
                    <div className="galpon-score" style={{ color: g.color }}>
                      {g.score}
                    </div>
                    <div className="galpon-tag">
                      <span className="galpon-tag-id">{g.label}</span>
                      <span className="galpon-tag-state">
                        {g.status === 'crit' ? 'crítico' : g.status === 'warn' ? 'atención' : 'óptimo'}
                      </span>
                    </div>
                  </div>
                  {g.sensors.map((s, si) => (
                    <div key={si} className="sensor" style={{ left: s.x, top: s.y }}>
                      <span className="sensor-dot" style={{ background: s.c, boxShadow: `0 0 10px ${s.c}` }} />
                      <span className="sensor-ring" style={{ borderColor: s.c, animationDelay: `${si * 0.4}s` }} />
                    </div>
                  ))}
                </div>
              ))}
              <div className="link link-h-top" />
              <div className="link link-v-l" />
              <div className="link link-v-r" />
              <div className="link link-h-bot" />
            </div>
          </div>

          <div className="annot annot-tl">
            <span className="annot-key">temp</span>
            <span className="annot-val">22.4°C</span>
            <span className="annot-trend">↘ −0.3</span>
          </div>
          <div className="annot annot-tr">
            <span className="annot-key">amoníaco</span>
            <span className="annot-val">08 ppm</span>
            <span className="annot-trend annot-warn">↑ +1.2</span>
          </div>
          <div className="annot annot-bl">
            <span className="annot-key">consumo</span>
            <span className="annot-val">2.31 kg/d</span>
            <span className="annot-trend">↑ +4%</span>
          </div>
          <div className="annot annot-br">
            <span className="annot-key">aves</span>
            <span className="annot-val">59,500</span>
            <span className="annot-trend">04 galpones</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Farm3D
