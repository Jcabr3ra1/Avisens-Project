import { useFadeUp } from '@shared/hooks/useFadeUp'
import './Problems.css'

const problems = [
  {
    icon: '📊',
    title: 'Sin visibilidad en tiempo real',
    desc: 'Los datos del galpón están en cuadernos. Cuando detectas un problema, ya hay mortalidad.',
    sol: 'AVISENS mide temperatura, humedad, CO₂ y NH₃ cada minuto. Te avisa antes de que el problema escale.',
  },
  {
    icon: '💸',
    title: 'No sabes si el ciclo es rentable',
    desc: 'Calcular FCR, costo/ave y ROI real toma horas de Excel — y casi nadie lo hace correctamente.',
    sol: 'El Panel Financiero AVISENS proyecta tu rentabilidad desde el día 1 del ciclo, con datos en vivo.',
  },
  {
    icon: '🔕',
    title: 'Las alertas llegan cuando ya es tarde',
    desc: 'Te enteras de un galpón crítico a las 3am cuando ya perdiste aves. Sin sistema, sin alerta, sin tiempo.',
    sol: 'AVISENS te envía alertas críticas por WhatsApp antes de que la situación sea irreversible.',
  },
]

function Problems() {
  const ref = useFadeUp()

  return (
    <section id="problems">
      <div className="max-w fade-up" ref={ref}>
        <div className="section-label">El problema real</div>
        <h2 className="section-title">
          ¿Cuánto te está costando
          <br />
          gestionar con <span className="grad-text-pk">Excel y WhatsApp</span>?
        </h2>
        <p className="section-sub">
          El 85% de los avicultores en Colombia pierden entre $3,000 y $8,000 USD por año en ineficiencias que la tecnología puede eliminar.
        </p>
        <div className="problems">
          {problems.map(({ icon, title, desc, sol }, index) => (
            <div key={title} className="problem-card" data-step={`0${index + 1}`}>
              <div className="prob-icon">{icon}</div>
              <div className="prob-title">{title}</div>
              <div className="prob-desc">{desc}</div>
              <div className="arrow-sep">
                <div className="arrow-sep-line" />
              </div>
              <div className="solution-card">
                <div className="sol-tag">Solución AVISENS</div>
                <div className="sol-text">{sol}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Problems
