import Farm3D from '../Farm3D/Farm3D'
import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="hero-badge-dot" />
        Sistema Avícola Inteligente · Colombia 2026
      </div>
      <h1>
        Gestiona tu granja
        <br />
        como los <span className="grad-text">mejores del mundo</span>
      </h1>
      <p className="hero-sub">
        Monitoreo IoT en tiempo real, Health Score™ exclusivo, asistente IA y alertas por WhatsApp. La plataforma más completa del mercado latinoamericano — a precio local.
      </p>
      <div className="hero-ctas">
        <a href="#pricing" className="btn-hero btn-hero-v">
          Empezar gratis →
        </a>
        <a href="#chatbot" className="btn-hero btn-hero-o">
          Hablar con AVIA IA
        </a>
      </div>
      <Farm3D />
    </section>
  )
}

export default Hero
