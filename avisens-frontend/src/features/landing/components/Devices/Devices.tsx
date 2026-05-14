import { useFadeUp } from '@shared/hooks/useFadeUp'
import './Devices.css'

function Devices() {
  const ref = useFadeUp()

  return (
    <section id="devices" style={{ background: 'var(--bg3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="devices-inner fade-up" ref={ref}>
        <div className="section-label" style={{ justifyContent: 'center' }}>
          Multiplataforma
        </div>
        <h2 className="section-title">
          Disponible en todos
          <br />
          tus <span className="grad-text">dispositivos</span>
        </h2>
        <p className="section-sub" style={{ margin: '0 auto' }}>
          AVISENS es una plataforma web y móvil. Los técnicos en campo usan el celular. Los administradores, el escritorio. Todos con la misma información en tiempo real.
        </p>
        <div className="avail-badge" style={{ marginTop: '1.5rem' }}>
          ● Disponible en iOS · Android · Web
        </div>
        <div className="devices-grid">
          {/* Mobile */}
          <div className="device-card">
            <div className="device-screen" style={{ background: 'transparent', border: 'none', padding: '1.5rem 0' }}>
              <div className="phone-chrome">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 5, color: 'var(--text3)', marginBottom: 2 }}>AVISENS · Dashboard</div>
                    <div className="mini-row">
                      {[
                        ['94', '#10b981'],
                        ['71', '#f59e0b'],
                        ['97', '#10b981'],
                        ['48', '#ef4444'],
                      ].map(([v, c], i) => (
                        <div key={i} className="mini-kpi">
                          <div style={{ fontSize: 5, color: 'var(--text3)' }}>G{i + 1}</div>
                          <div className="mini-kpi-val" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mini-card">
                      <div style={{ fontSize: 4, color: 'var(--text3)', fontFamily: 'DM Mono' }}>Temp · G1</div>
                      <div className="mini-bar" style={{ width: '75%', background: '#10b981' }} />
                      <div style={{ fontSize: 6, color: 'var(--text)', fontFamily: 'Space Grotesk', fontWeight: 700 }}>22°C</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <div className="mini-card" style={{ flex: 1 }}>
                        <div style={{ fontSize: 4, color: 'var(--text3)' }}>Hum</div>
                        <div style={{ fontSize: 6, color: '#f59e0b', fontWeight: 700 }}>65%</div>
                      </div>
                      <div className="mini-card" style={{ flex: 1 }}>
                        <div style={{ fontSize: 4, color: 'var(--text3)' }}>CO₂</div>
                        <div style={{ fontSize: 6, color: '#10b981', fontWeight: 700 }}>2.2k</div>
                      </div>
                    </div>
                    <div className="mini-card" style={{ background: 'rgba(255,71,87,.1)', border: '1px solid rgba(255,71,87,.3)' }}>
                      <div style={{ fontSize: 5, color: '#ef4444', fontFamily: 'DM Mono' }}>⚠ G4 CRÍTICO 28°C</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="device-title">App Móvil</div>
            <div className="device-desc">Optimizada para uso con una mano. Los técnicos de campo registran datos, ven alertas y controlan equipos directamente desde el galpón.</div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {['iOS', 'Android'].map((p) => (
                <span key={p} className="device-tag">{p}</span>
              ))}
            </div>
          </div>

          {/* Desktop */}
          <div className="device-card">
            <div className="device-screen" style={{ background: 'transparent', border: 'none', padding: '1rem 0 1.5rem' }}>
              <div className="desktop-chrome">
                <div className="desktop-bar">
                  <div className="d-dot" style={{ background: '#ef4444' }} />
                  <div className="d-dot" style={{ background: '#f59e0b' }} />
                  <div className="d-dot" style={{ background: '#10b981' }} />
                  <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 3, height: 10, marginLeft: 6 }} />
                </div>
                <div className="desktop-content">
                  <div style={{ display: 'flex', gap: 4, minHeight: 80 }}>
                    <div className="mini-sidebar">
                      {[true, false, false, false, false].map((a, i) => (
                        <div key={i} className="mini-s-item" style={{ background: a ? 'var(--success)' : 'var(--border)' }} />
                      ))}
                    </div>
                    <div className="mini-main">
                      <div className="mini-row">
                        {[
                          ['59.5k', 'Aves', '#10b981'],
                          ['0.8%', 'Mort', '#f59e0b'],
                          ['1.64', 'FCR', '#f59e0b'],
                          ['$12.4k', 'ROI', '#10b981'],
                        ].map(([v, l, c]) => (
                          <div key={l} className="mini-kpi">
                            <div style={{ fontSize: 4, color: 'var(--text3)' }}>{l}</div>
                            <div className="mini-kpi-val" style={{ color: c, fontSize: 8 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                        {[94, 71, 97, 48].map((s, i) => {
                          const c = s > 80 ? '#10b981' : s > 60 ? '#f59e0b' : '#ef4444'
                          return (
                            <div key={i} className="mini-card">
                              <div style={{ fontSize: 4, color: 'var(--text3)', marginBottom: 1 }}>G{i + 1}</div>
                              <div className="mini-bar" style={{ width: `${s}%`, background: c }} />
                              <div style={{ fontSize: 7, color: c, fontWeight: 700 }}>{s}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="device-title">Web App</div>
            <div className="device-desc">Panel completo para administradores. Dashboards financieros, comparadores de galpones, reportes PDF y gestión de usuarios desde cualquier navegador.</div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {['Chrome', 'Safari', 'Edge'].map((p) => (
                <span key={p} className="device-tag">{p}</span>
              ))}
            </div>
          </div>

          {/* Tablet */}
          <div className="device-card">
            <div className="device-screen" style={{ background: 'transparent', border: 'none', padding: '1.5rem 0' }}>
              <div className="tablet-chrome">
                <div className="tablet-cam" />
                <div className="tablet-screen">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 5, color: 'var(--text3)' }}>Automatización · Control manual</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                      {[
                        ['Ventilador 1', '#10b981', true],
                        ['Iluminación', '#10b981', true],
                        ['Comedero', '#f59e0b', false],
                        ['Calefacción', '#ef4444', false],
                      ].map(([l, c, on]) => (
                        <div key={l as string} className="mini-card">
                          <div style={{ fontSize: 4, color: 'var(--text3)', fontFamily: 'DM Mono' }}>{l as string}</div>
                          <div style={{ marginTop: 2, width: '100%', height: 8, borderRadius: 4, background: on ? (c as string) : 'var(--border)', opacity: on ? 1 : 0.4 }} />
                          <div style={{ fontSize: 5, color: on ? (c as string) : 'var(--text3)' }}>{on ? 'ON' : 'OFF'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mini-card" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                      <div style={{ fontSize: 4, color: 'var(--warning)', fontFamily: 'DM Mono' }}>REGLA ACTIVA: Temp &gt;26°C → Ventilador ON</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="device-title">Tablet en Galpón</div>
            <div className="device-desc">Modo quiosco para operarios de campo. Pantalla siempre encendida con controles manuales de equipos, alertas activas y registro de novedades.</div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {['iPad', 'Android Tab'].map((p) => (
                <span key={p} className="device-tag">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Devices
