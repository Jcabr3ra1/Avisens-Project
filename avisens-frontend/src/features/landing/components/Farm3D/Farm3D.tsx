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
  status: string
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
    <div className="farm-scene-wrap">
      <div style={{ position: 'relative' }}>
        <div className="float-metric" style={{ top: '-2rem', right: '5%', animation: 'float 4s ease-in-out infinite' }}>
          <div className="fm-label">Health Score</div>
          <div className="fm-val" style={{ color: '#10b981' }}>
            94<span style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>/100</span>
          </div>
          <div className="fm-sub">Galpón 1 · Óptimo</div>
        </div>
        <div className="float-metric" style={{ bottom: '4rem', left: '2%', animation: 'float2 5s ease-in-out infinite' }}>
          <div className="fm-label">Temperatura</div>
          <div className="fm-val" style={{ color: '#10b981' }}>22°C</div>
          <div className="fm-sub">✓ Rango óptimo</div>
        </div>
        <div className="float-metric" style={{ top: '20%', left: '-2%', animation: 'float 6s ease-in-out infinite 0.5s' }}>
          <div className="fm-label">FCR</div>
          <div className="fm-val" style={{ color: '#10b981' }}>1.64</div>
          <div className="fm-sub">↑ Mejor que objetivo 1.65</div>
        </div>
        <div className="float-metric" style={{ bottom: '3.5rem', right: '3%', animation: 'float2 4.5s ease-in-out infinite 1s' }}>
          <div className="fm-label">Aves activas</div>
          <div className="fm-val" style={{ color: 'var(--text)' }}>59,500</div>
          <div className="fm-sub">4 galpones</div>
        </div>

        <div className="farm-perspective">
          <div className="farm-plane">
            {galpones.map((g) => (
              <div key={g.id} style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(160deg, #0f2420 0%, #0a1e18 100%)',
                    border: `1px solid ${g.color}55`,
                    borderRadius: 6,
                    boxShadow: `0 0 18px ${g.color}28`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 5,
                      overflow: 'hidden',
                      backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 16px)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontFamily: 'Space Grotesk',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: g.color,
                      background: 'rgba(10,22,18,0.92)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      padding: '1px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.score}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontFamily: 'DM Mono',
                      fontSize: '0.6rem',
                      color: 'var(--text3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.label} · {g.id === 4 ? '⚠ CRÍTICO' : g.id === 2 ? '⚡ Atención' : '✓ Óptimo'}
                  </div>
                </div>
                {g.sensors.map((s, si) => (
                  <div key={si} style={{ position: 'absolute', left: s.x, top: s.y, zIndex: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: s.c,
                        boxShadow: `0 0 8px ${s.c}`,
                        animation: 'sensor-pulse 2s ease-in-out infinite',
                        animationDelay: `${si * 0.7}s`,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: s.c,
                        top: 0,
                        left: 0,
                        opacity: 0.6,
                        animation: `ping ${1.8 + si * 0.3}s ease-out infinite`,
                        animationDelay: `${si * 0.5}s`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <div style={{ position: 'absolute', left: 200, top: 50, width: 32, height: 1, background: 'linear-gradient(90deg, rgba(16,185,129,0.4), rgba(16,185,129,0.15))' }} />
            <div style={{ position: 'absolute', left: 120, top: 115, width: 1, height: 42, background: 'linear-gradient(var(--border2), rgba(16,185,129,0.28))' }} />
            <div style={{ position: 'absolute', left: 310, top: 115, width: 1, height: 42, background: 'linear-gradient(var(--border2), rgba(16,185,129,0.12))' }} />
            <div style={{ position: 'absolute', left: 200, top: 195, width: 32, height: 1, background: 'linear-gradient(90deg, rgba(16,185,129,0.28), rgba(239,68,68,0.3))' }} />
          </div>
        </div>
        <div className="farm-fade" />
        <div className="farm-fade-l" />
        <div className="farm-fade-r" />
      </div>
      <div style={{ textAlign: 'center', marginTop: '0.5rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text3)' }}>
        Vista en tiempo real · 4 galpones monitoreados · IoT activo
      </div>
    </div>
  )
}

export default Farm3D
