import LoginForm from './components/LoginForm/LoginForm'
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-visual" aria-label="Monitoreo AVISENS">
          <div className="login-brand">
            <img src="/views/avisens/img/logo.png" alt="AVISENS" />
            <span>AVISENS</span>
          </div>

          <div className="login-visual-copy">
            <div className="login-badge">
              <span className="login-brand-dot" />
              Plataforma activa · LATAM 2026
            </div>
            <h1>Control operativo para granjas conectadas.</h1>
            <p>Monitorea galpones, sensores, alertas y ciclos desde un panel diseñado para decisiones rápidas.</p>
          </div>

          <div className="login-metrics" aria-hidden="true">
            <div className="login-metric">
              <span className="lm-label">Health Score</span>
              <strong>87</strong>
              <span className="lm-trend">Estable</span>
            </div>
            <div className="login-metric">
              <span className="lm-label">Alertas</span>
              <strong>3</strong>
              <span className="lm-trend warn">Revisar</span>
            </div>
            <div className="login-metric">
              <span className="lm-label">Sensores</span>
              <strong>128</strong>
              <span className="lm-trend">En línea</span>
            </div>
          </div>
        </section>

        <main className="login-panel">
          <LoginForm />
        </main>
      </div>

      <p className="login-footer-note">
        v1.0 · Sistema de Monitoreo Avícola · Cauca, Colombia
      </p>
    </div>
  )
}

export default LoginPage
