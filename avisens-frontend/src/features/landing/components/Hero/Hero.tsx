import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-bg-overlay" />

      <div className="hero-content">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            IoT + IA para granjas avícolas
          </div>
          <h1>
            Avicultura simple,
            <br />
            inteligente y <span>conectada</span>
          </h1>
          <p className="hero-sub">
            Controla temperatura, humedad, alertas y decisiones del galpón desde una plataforma diseñada para actuar a tiempo.
          </p>
          <div className="hero-ctas">
            <a href="#telemetria" className="btn-hero btn-hero-primary">
              Ver soluciones
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#chatbot" className="btn-hero btn-hero-secondary">
              Hablar con AVIA
            </a>
          </div>
        </div>

      </div>

      <div className="hero-bottom-strip">
        <span>Monitoreo en tiempo real</span>
        <span>Decisiones con IA</span>
        <span>Automatización del galpón</span>
      </div>

      <svg
        className="hero-divider"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,80 L0,52 C240,8 540,8 720,32 C900,56 1200,72 1440,28 L1440,80 Z" />
      </svg>
    </section>
  )
}

export default Hero
