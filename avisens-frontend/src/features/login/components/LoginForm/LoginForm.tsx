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
        <h1 className="lf-title">Bienvenido</h1>
        <p className="lf-sub">Ingresa con tu cuenta o usa acceso rápido</p>
      </div>

      <form className="lf-form" onSubmit={handleSubmit} noValidate>
        <div className="lf-field">
          <label className="lf-label" htmlFor="email">Correo electrónico</label>
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

        <div className="lf-field">
          <label className="lf-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            className="lf-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'lf-error-msg' : undefined}
          />
        </div>

        {error && <p id="lf-error-msg" className="lf-error" role="alert">{error}</p>}

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
            <span className="lf-demo-rol">{u.rol}</span>
          </button>
        ))}
      </div>

      <p className="lf-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </div>
  )
}

export default LoginForm
