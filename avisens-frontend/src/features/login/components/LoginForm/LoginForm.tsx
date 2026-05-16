import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const DEMO_USERS = [
  { rol: 'Administrador', email: 'admin@avisens.co',    init: 'AA', color: '#a78bfa' },
  { rol: 'Usuario',       email: 'carlos@laspalmas.co', init: 'CM', color: '#10b981' },
  { rol: 'Operario',      email: 'juan@avisens.co',     init: 'JR', color: '#22d3ee' },
]

function LoginForm() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completa todos los campos.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/dashboard') }, 900)
  }

  function handleQuickAccess(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo1234')
    setError('')
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/dashboard') }, 700)
  }

  return (
    <div className="bg-bg2 border border-border2 rounded-2xl px-8 py-9 shadow-[0_24px_64px_rgba(0,0,0,0.4),0_0_0_1px_rgba(16,185,129,0.06)] animate-[fadeUp_0.5s_ease_both]">

      {/* header */}
      <div className="text-center mb-7">
        <h1 className="font-['Space_Grotesk'] text-[1.65rem] font-bold tracking-[-0.03em] text-text mb-1.5">
          Bienvenido
        </h1>
        <p className="text-[0.85rem] text-text3">
          Ingresa con tus credenciales de acceso
        </p>
      </div>

      {/* form */}
      <form className="flex flex-col gap-4 mb-5" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[0.78rem] font-semibold text-text2 tracking-[0.02em]">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            placeholder="usuario@granja.co"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'lf-error-msg' : undefined}
            className="bg-bg3 border border-border rounded-lg px-3.5 py-2.5 text-text text-[0.9rem] outline-none transition-all duration-200 placeholder:text-text4 focus:border-success focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-[0.78rem] font-semibold text-text2 tracking-[0.02em]">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'lf-error-msg' : undefined}
            className="bg-bg3 border border-border rounded-lg px-3.5 py-2.5 text-text text-[0.9rem] outline-none transition-all duration-200 placeholder:text-text4 focus:border-success focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          />
        </div>

        {error && (
          <p id="lf-error-msg" role="alert" className="text-[0.8rem] text-danger2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full py-2.5 bg-success text-[#0a1612] font-bold text-[0.9rem] rounded-lg border-none cursor-pointer transition-all duration-200 flex items-center justify-center min-h-[42px] hover:not-disabled:bg-success2 hover:not-disabled:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:not-disabled:-translate-y-px disabled:opacity-65 disabled:cursor-not-allowed"
        >
          {loading
            ? <span className="w-[18px] h-[18px] rounded-full border-[2.5px] border-[rgba(10,22,18,0.3)] border-t-[#0a1612] animate-spin" aria-hidden="true" />
            : 'Iniciar sesión'
          }
        </button>
      </form>

      {/* divider */}
      <div className="flex items-center gap-3 my-5 text-text4 text-[0.75rem] tracking-[0.04em] before:content-[''] before:flex-1 before:h-px before:bg-border after:content-[''] after:flex-1 after:h-px after:bg-border">
        Acceso rápido de prueba
      </div>

      {/* demo grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {DEMO_USERS.map(u => (
          <button
            key={u.email}
            onClick={() => handleQuickAccess(u.email)}
            disabled={loading}
            className="flex flex-col items-center gap-2 py-3 px-2 bg-bg3 border border-border rounded-[10px] cursor-pointer transition-all duration-200 hover:not-disabled:bg-card-h hover:not-disabled:border-border3 hover:not-disabled:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[0.72rem] font-bold font-['DM_Mono',monospace]"
              style={{ background: u.color + '22', color: u.color }}
            >
              {u.init}
            </span>
            <span className="text-[0.72rem] text-text2 font-medium">{u.rol}</span>
          </button>
        ))}
      </div>

      {/* volver */}
      <p className="text-center text-[0.8rem]">
        <Link to="/" className="text-text3 no-underline transition-colors duration-200 hover:text-success">
          ← Volver al inicio
        </Link>
      </p>

    </div>
  )
}

export default LoginForm
