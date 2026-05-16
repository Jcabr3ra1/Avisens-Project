import { useFadeUp } from '@shared/hooks/useFadeUp'
import './CTAFinal.css'

function CTAFinal() {
  const ref = useFadeUp()

  return (
    <section className="cta-section">
      <div className="fade-up" ref={ref}>
        <div className="cta-box">
          <div className="cta-badge">Listo para operar mejor</div>
          <h2>
            Transforma tu granja hoy.
            <br />
            <span className="grad-text">Empieza en 10 minutos.</span>
          </h2>
          <p>
            14 días gratis. Sin tarjeta de crédito. Sin compromiso.
            <br />
            Únete a los más de 340 avicultores que ya confían en AVISENS.
          </p>
          <div className="cta-row">
            <a href="#pricing" className="cta-btn cta-btn-primary">
              Empezar gratis
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a href="mailto:contacto@avisens.com" className="cta-btn cta-btn-secondary">
              Hablar con ventas
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTAFinal
