import CoopShowcase from './CoopShowcase'
import './Telemetria.css'

type Feature = {
  num: string
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  {
    num: '01',
    title: 'Lecturas en vivo',
    desc: 'Temperatura, humedad, alimento, agua y ventilación actualizados en tiempo real desde sensores físicos en cada zona.',
  },
  {
    num: '02',
    title: 'Alertas automáticas',
    desc: 'Cuando un valor sale del rango óptimo, AVISENS te avisa antes de que afecte al lote — sin tener que estar revisando.',
  },
  {
    num: '03',
    title: 'Decisiones con IA',
    desc: 'El sistema interpreta los patrones del galpón y sugiere qué acción tomar: ventilar, racionar, hidratar o intervenir.',
  },
]

function Telemetria() {
  return (
    <section className="telemetria-section" id="telemetria">
      <div className="telemetria-head">
        <div className="telemetria-eyebrow">
          <span className="telemetria-eyebrow-num">01</span>
          <span className="telemetria-eyebrow-line" />
          <span className="telemetria-eyebrow-txt">Vista por galpón</span>
        </div>
        <h2 className="telemetria-title">
          Cada sensor en su sitio.<br />
          <em>Toda la lectura en una vista.</em>
        </h2>
        <p className="telemetria-lede">
          Asomate a cualquier galpón y mira lo que pasa adentro sin tener que estar adentro.
          AVISENS conecta los sensores físicos con una interfaz clara — temperatura, humedad,
          alimento, agua, ventilación y acceso, todo en una sola pantalla.
        </p>
      </div>

      <CoopShowcase />

      <ul className="telemetria-features">
        {FEATURES.map((f) => (
          <li key={f.num} className="telemetria-feature">
            <span className="telemetria-feature-num">{f.num}</span>
            <h3 className="telemetria-feature-title">{f.title}</h3>
            <p className="telemetria-feature-desc">{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Telemetria
