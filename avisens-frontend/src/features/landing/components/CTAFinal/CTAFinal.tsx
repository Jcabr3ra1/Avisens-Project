import { useFadeUp } from '@shared/hooks/useFadeUp'
import './CTAFinal.css'

function CTAFinal() {
  const ref = useFadeUp()

  return (
    <section>
      <div className="fade-up" ref={ref}>
        <div className="cta-box">
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
            <a href="#pricing" className="btn-hero btn-hero-v">
              Empezar gratis →
            </a>
            <a href="mailto:contacto@avisens.com" className="btn-hero btn-hero-o">
              Hablar con ventas
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTAFinal
