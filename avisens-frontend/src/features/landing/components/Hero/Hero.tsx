import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-bg-overlay" />

      <div className="hero-content">
        <p className="hero-side-copy hero-side-copy-left">
          Tecnología colombiana para cuidar cada galpón y cada lote.
        </p>

        <div className="hero-copy">
          <h1>AVISENS</h1>

          <p className="hero-sub">
            Avicultura inteligente para el campo colombiano.
          </p>

          <div className="hero-ctas">
            <a href="#beneficios" className="btn-hero btn-hero-primary">
              Conocer Avisens
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="https://wa.me/573022358210?text=Hola%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20Avisens"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero btn-hero-secondary"
            >
              Hablar con nosotros
            </a>
          </div>
        </div>

        <p className="hero-side-copy hero-side-copy-right">
          Alertas claras. Información a tiempo. Decisiones con confianza.
        </p>
      </div>

      <div className="hero-bottom-strip">
        <span>Alertas fáciles de entender</span>
        <span>Información de tu granja</span>
        <span>Acompañamiento cercano</span>
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
  );
}

export default Hero;
