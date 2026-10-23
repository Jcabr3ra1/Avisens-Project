import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { login } from '@shared/api'
import { ROL_ADMIN, ROL_OPERARIO } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import CargaConLogo from '@shared/ui/Estados/CargaConLogo'
import './LoginForm.css'

function LoginForm() {
  const navigate = useNavigate()
  const [username, setUsername]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false)
  const [entrando, setEntrando] = useState<string | null>(null)

  useEffect(() => {
    if (!entrando) return
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const espera = window.setTimeout(() => navigate(entrando), reducir ? 300 : 1800)
    return () => window.clearTimeout(espera)
  }, [entrando, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMostrarRecuperacion(false)

    if (!username.trim() || !password) {
      setError('Por favor complete todos los campos.')
      return
    }

    setLoading(true)
    try {
      // Hacemos login y recibimos el objeto con el rol del usuario
      const respuesta = await login({ username: username.trim().toLowerCase(), password })

      if (respuesta.requiere_cambio_password) {
        navigate('/cambiar-password')
        return
      }

      setEntrando(
        respuesta.usuario.rol === ROL_ADMIN ? '/admin'
          : respuesta.usuario.rol === ROL_OPERARIO ? '/mi-jornada'
            : '/dashboard',
      )
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const esErrorDeAcceso = err.response.status === 401 || err.response.status === 403
        setMostrarRecuperacion(esErrorDeAcceso)
        setError(
          err.response.status === 401
            ? 'No pudimos verificar el usuario o la contraseña.'
            : mensajeDeError(err, 'No se pudo iniciar sesión. Intente de nuevo.'),
        )
      } else {
        setError('No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lf-card">
      {entrando && (
        <div className="lf-entrando">
          <CargaConLogo texto="Preparando tu panel…" />
        </div>
      )}
      <div className="lf-header">
        <h1 className="lf-title">Bienvenido de nuevo</h1>
        <p className="lf-sub">Ingresa el usuario y la contraseña que te entregaron.</p>
      </div>

      <form className="lf-form" onSubmit={handleSubmit} noValidate>
        <div className="lf-field">
          <label className="lf-label" htmlFor="username">Usuario</label>
          <div className="lf-input-wrap">
            <input
              id="username"
              name="username"
              className="lf-input"
              type="text"
              placeholder="maria.lopez"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'lf-error-msg' : undefined}
            />
          </div>
        </div>

        <div className="lf-field">
          <div className="lf-password-heading">
            <label className="lf-label" htmlFor="password">Contraseña</label>
            <Link className="lf-link" to="/recuperar-password">¿Olvidó su contraseña?</Link>
          </div>
          <div className="lf-input-wrap">
            <input
              id="password"
              name="password"
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
              aria-pressed={showPassword}
              aria-controls="password"
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

        {error && (
          <div id="lf-error-msg" className="lf-error" role="alert">
            <p>{error}</p>
            {mostrarRecuperacion && (
              <Link to="/recuperar-password">
                ¿Confirmaste los datos? Restablece tu contraseña.
              </Link>
            )}
          </div>
        )}

        <button className="lf-btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <><span className="lf-spinner" aria-hidden="true" /><span>Entrando…</span></>
          ) : (
            <><span>Entrar</span><svg className="lf-btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>
          )}
        </button>
      </form>

      <p className="lf-back">
        <Link to="/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Volver al inicio</Link>
      </p>
    </div>
  )
}

export default LoginForm
