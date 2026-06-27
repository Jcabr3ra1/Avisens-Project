// LoginPage.tsx — Página de inicio de sesión de AVISENS
// Pantalla completa con dos paneles: visual (izquierda) + formulario (derecha)
// Diseñada con lenguaje campesino colombiano y usted formal
import LoginForm from './components/LoginForm/LoginForm'
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      {/* Decoraciones de fondo — círculos radiales verde y dorado */}
      <div className="login-deco" aria-hidden="true">
        <div className="login-deco-circle login-deco-circle--1" />
        <div className="login-deco-circle login-deco-circle--2" />
      </div>

      {/* Shell principal — grid de 2 columnas: visual + formulario */}
      <div className="login-shell">

        {/* ═══ PANEL VISUAL (izquierda) ═══ */}
        {/* Muestra la imagen de la granja con overlay + texto + métricas */}
        <section className="login-visual" aria-label="Bienvenida AVISENS">
          {/* Logo AVISENS arriba a la izquierda */}
          <div className="login-brand">
            <img src="/views/avisens/img/logo.png" alt="AVISENS" />
            <span>AVISENS</span>
          </div>

          {/* Texto principal con lenguaje campesino */}
          <div className="login-visual-copy">
            {/* Badge verde con punto pulsante — indica que los sensores están activos */}
            <div className="login-badge">
              <span className="login-brand-dot" />
              Sensores activos · Cauca, Colombia
            </div>
            {/* Título principal — habla directo al campesino */}
            <h1>Su granja bajo control, desde cualquier lugar.</h1>
            {/* Descripción en español sencillo */}
            <p>Revise sus galpones, reciba alertas y lleve la bitácora del lote sin salir de su casa. AVISENS cuida lo que usted construyó.</p>
          </div>

          {/* Métricas decorativas con iconos — muestran datos simulados */}
          <div className="login-metrics" aria-hidden="true">
            {/* Métrica 1: Estado general con icono de pulso */}
            <div className="login-metric">
              <div className="lm-icon lm-icon--ok">
                <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div className="lm-data">
                <span className="lm-label">Estado general</span>
                <strong>87<span className="lm-unit">/100</span></strong>
                <span className="lm-trend">Todo en orden</span>
              </div>
            </div>
            {/* Métrica 2: Alertas pendientes con icono de triángulo */}
            <div className="login-metric">
              <div className="lm-icon lm-icon--warn">
                <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="lm-data">
                <span className="lm-label">Alertas hoy</span>
                <strong>3</strong>
                <span className="lm-trend warn">Pendientes</span>
              </div>
            </div>
            {/* Métrica 3: Sensores conectados con icono de sol/sensor */}
            <div className="login-metric">
              <div className="lm-icon lm-icon--ok">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              </div>
              <div className="lm-data">
                <span className="lm-label">Sensores</span>
                <strong>128</strong>
                <span className="lm-trend">Conectados</span>
              </div>
            </div>
          </div>

          {/* Indicador de confianza — Ley 1581 de protección de datos */}
          <div className="login-trust" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Datos cifrados · Ley 1581 de 2012</span>
          </div>
        </section>

        {/* ═══ PANEL DEL FORMULARIO (derecha) ═══ */}
        {/* Fondo claro con textura orgánica sutil */}
        <main className="login-panel">
          <LoginForm />
        </main>
      </div>

      {/* Pie de página con versión y datos del proyecto */}
      <p className="login-footer-note">
        AVISENS v1.0 · Gestión Avícola Inteligente · SENA Cauca, Colombia 2026
      </p>
    </div>
  )
}

export default LoginPage
