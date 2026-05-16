import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-bg-overlay" />

      <div className="hero-twin" aria-label="Escaneo digital del galpón AVISENS">
        <div className="twin-scan" />
        <svg className="twin-svg" viewBox="0 0 640 420" aria-hidden="true">
          <path className="twin-roof" d="M58 164 L326 52 L596 154" />
          <path className="twin-outline" d="M96 172 L596 154 L596 326 L96 348 Z" />
          <path className="twin-outline" d="M96 172 L326 52 L596 154" />
          <path className="twin-grid" d="M154 170 L154 344 M220 154 L220 338 M286 134 L286 333 M352 82 L352 328 M420 104 L420 324 M486 126 L486 320 M552 148 L552 316" />
          <path className="twin-grid" d="M98 215 L596 198 M98 262 L596 246 M98 309 L596 292" />
          <path className="twin-link" d="M188 238 C258 176 366 174 442 232 S540 270 574 236" />
          <path className="twin-link" d="M236 316 C312 280 396 282 476 310" />
          <circle className="twin-node" cx="188" cy="238" r="8" />
          <circle className="twin-node info" cx="442" cy="232" r="8" />
          <circle className="twin-node warn" cx="574" cy="236" r="8" />
          <circle className="twin-node" cx="476" cy="310" r="8" />
        </svg>
        <div className="twin-label twin-temp">Temp. 25.4°C</div>
        <div className="twin-label twin-air">CO₂ bajando</div>
        <div className="twin-label twin-score">
          Health Score <strong>87</strong>
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            IoT + IA para avicultura · LATAM 2026
          </div>
          <h1>
            Galpones inteligentes
            <br />
            con <span className="gradient-text">datos vivos</span>
          </h1>
          <p className="hero-sub">
            AVISENS conecta sensores, alertas y asistencia IA para que cada decisión sobre tus aves llegue a tiempo, sin perder el pulso de la granja.
          </p>
          <div className="hero-ctas">
            <a href="#pricing" className="btn-hero btn-hero-primary">
              Ver soluciones
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#chatbot" className="btn-hero btn-hero-secondary">
              Hablar con AVIA
            </a>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <div className="trust-num">340+</div>
              <div className="trust-label">Granjas activas</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">4.2M</div>
              <div className="trust-label">Aves monitoreadas</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">99.7%</div>
              <div className="trust-label">Uptime</div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-fade-bottom" />
    </section>
  )
}

export default Hero
