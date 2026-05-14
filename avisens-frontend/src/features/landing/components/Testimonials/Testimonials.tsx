import { useFadeUp } from '@shared/hooks/useFadeUp'
import './Testimonials.css'

const testimonials = [
  {
    t: 'Desde que implementamos AVISENS, la mortalidad bajó un 40%. Ahora sé el estado de cada galpón sin tener que estar físicamente allá.',
    n: 'Juan Carlos Medina',
    r: 'Propietario · Granja Los Alpes, Cundinamarca',
    i: 'JM',
  },
  {
    t: 'El Health Score me cambió la forma de operar. Antes revisaba 6 sensores distintos; ahora un solo número me dice si debo preocuparme. Así de simple.',
    n: 'María Fernanda Torres',
    r: 'Administradora · Avícola San Pedro, Antioquia',
    i: 'MT',
  },
  {
    t: 'La alerta de WhatsApp a las 2am me salvó el lote. Temperatura del galpón 3 subió a 31°C y AVISENS me avisó antes de que hubiera mortalidad masiva.',
    n: 'Carlos Ruiz Quintero',
    r: 'Técnico de campo · Pollos del Valle, Valle del Cauca',
    i: 'CR',
  },
]

function Testimonials() {
  const ref = useFadeUp()

  return (
    <section>
      <div className="max-w fade-up" ref={ref} style={{ textAlign: 'center' }}>
        <div className="section-label" style={{ justifyContent: 'center' }}>
          Testimonios
        </div>
        <h2 className="section-title">
          Lo que dicen nuestros
          <br />
          <span className="grad-text">clientes</span>
        </h2>
        <div className="testi-grid">
          {testimonials.map(({ t, n, r, i }) => (
            <div key={n} className="testi-card">
              <div className="testi-stars">
                {[...Array(5)].map((_, x) => (
                  <span key={x}>★</span>
                ))}
              </div>
              <div className="testi-text">"{t}"</div>
              <div className="testi-author">
                <div className="testi-av">{i}</div>
                <div>
                  <div className="testi-name">{n}</div>
                  <div className="testi-role">{r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
