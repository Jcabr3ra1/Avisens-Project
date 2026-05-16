import LoginForm from './components/LoginForm/LoginForm'

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-8">

      {/* fondo degradado */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 0%, rgba(16,185,129,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 85% 100%, rgba(16,185,129,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 85% 10%, rgba(16,185,129,0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* grilla */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* logo top-left */}
      <div className="fixed top-7 left-8 z-10 flex items-center gap-2 font-['Space_Grotesk'] text-[1.1rem] font-bold tracking-[-0.02em] text-text">
        <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse motion-reduce:animate-none" />
        AVISENS
      </div>

      {/* formulario */}
      <div className="relative z-[1] w-full max-w-[420px]">
        <LoginForm />
      </div>

      {/* nota inferior */}
      <p className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1] text-[0.72rem] text-text3 font-['DM_Mono',monospace] whitespace-nowrap">
        v1.0 · Sistema de Monitoreo Avícola · Cauca, Colombia
      </p>

    </div>
  )
}

export default LoginPage
