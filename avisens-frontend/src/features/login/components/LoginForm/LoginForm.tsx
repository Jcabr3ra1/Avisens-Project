import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './LoginForm.css'

const DEMO_USERS = [
  { rol: 'Administrador', email: 'admin@avisens.co',        init: 'AA', color: '#a78bfa' },
  { rol: 'Usuario',       email: 'carlos@laspalmas.co',     init: 'CM', color: '#10b981' },
  { rol: 'Operario',      email: 'juan@avisens.co',         init: 'JR', color: '#22d3ee' },
]

function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Completa todos los campos.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 900)
  }

  function handleQuickAccess(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo1234')
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 700)
  }

  return (
    <div className="lf-card">
      <div className="lf-header">
        <span className="lf-kicker">Acceso seguro</span>
        <h1 className="lf-title">Bienvenido de nuevo</h1>
        <p className="lf-sub">Ingresa con tu cuenta AVISENS o usa un perfil de prueba.</p>
      </div>

      <form className="lf-form" onSubmit={handleSubmit} noValidate>
        <div className="lf-field">
          <label className="lf-label" htmlFor="email">Correo electrónico</label>
          <div className="lf-input-wrap">
            <svg className="lf-input-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16v12H4z" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <input
              id="email"
              className="lf-input"
              type="email"
              placeholder="usuario@granja.co"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'lf-error-msg' : undefined}
            />
          </div>
        </div>

        <div className="lf-field">
          <label className="lf-label" htmlFor="password">Contraseña</label>
          <div className="lf-input-wrap">
            <svg className="lf-input-ic" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="password"
              className="lf-input lf-input-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'lf-error-msg' : undefined}
            />
            <button
              className="lf-eye-btn"
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {showPassword ? (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5.5 0 9 5 9 8a7.2 7.2 0 0 1-2 3.7" />
                    <path d="M6.6 6.7C4.3 8.1 3 10.2 3 12c0 3 3.5 8 9 8 1.6 0 3-.4 4.2-1" />
                  </>
                ) : (
                  <>
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {error && <p id="lf-error-msg" className="lf-error" role="alert">{error}</p>}

        <div className="lf-row">
          <label className="lf-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <span>Recordarme</span>
          </label>
          <a className="lf-link" href="#recuperar">¿Olvidaste tu contraseña?</a>
        </div>

        <button className="lf-btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? <span className="lf-spinner" aria-hidden="true" /> : 'Iniciar sesión'}
        </button>
      </form>

      <div className="lf-divider">
        <span>Acceso rápido de prueba</span>
      </div>

      <div className="lf-demo-grid">
        {DEMO_USERS.map(u => (
          <button
            key={u.email}
            className="lf-demo-btn"
            onClick={() => handleQuickAccess(u.email)}
            disabled={loading}
          >
            <span className="lf-demo-avatar" style={{ background: u.color + '22', color: u.color }}>
              {u.init}
            </span>
            <span className="lf-demo-copy">
              <span className="lf-demo-rol">{u.rol}</span>
              <span className="lf-demo-email">{u.email}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="lf-back">
        <Link to="/">Volver al inicio</Link>
      </p>
    </div>
  )
}

export default LoginForm
