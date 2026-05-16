import LoginForm from './components/LoginForm/LoginForm'
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-bg-layer" />
      <div className="login-grid-layer" />

      <div className="login-brand">
        <span className="login-brand-dot" />
        AVISENS
      </div>

      <div className="login-center">
        <LoginForm />
      </div>

      <p className="login-footer-note">
        v1.0 · Sistema de Monitoreo Avícola · Cauca, Colombia
      </p>
    </div>
  )
}

export default LoginPage
