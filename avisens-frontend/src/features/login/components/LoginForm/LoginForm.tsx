import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { login } from '@shared/api'
import './LoginForm.css'

function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor complete todos los campos.')
      return
    }

    setLoading(true)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        setError(
          err.response.status === 401
            ? 'Correo o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Intente de nuevo.',
        )
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lf-card">
      <div className="lf-header">
        <span className="lf-kicker">Ingreso seguro</span>
        <h1 className="lf-title">Bienvenido a AVISENS</h1>
        <p className="lf-sub">Entre con su cuenta o use un perfil de prueba para conocer la plataforma.</p>
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
              placeholder="su.correo@granja.co"
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
            <span>Recordarme en este equipo</span>
          </label>
          <a className="lf-link" href="#recuperar">¿Olvidó su contraseña?</a>
        </div>

        <button className="lf-btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? <span className="lf-spinner" aria-hidden="true" /> : 'Entrar a mi granja'}
        </button>
      </form>

      <p className="lf-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </div>
  )
}

export default LoginForm
