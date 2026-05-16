import { useState } from 'react'
import { useFadeUp } from '@shared/hooks/useFadeUp'
import Ic from '@shared/ui/Ic/Ic'
import './Pricing.css'

const plans = [
  {
    name: 'Starter',
    desc: 'Para granjas pequeñas que quieren digitalizar',
    m: 29,
    a: 23,
    feats: [
      [true, '1-2 galpones'],
      [true, '2 usuarios'],
      [true, 'Dashboard + KPIs'],
      [true, 'Alertas básicas'],
      [true, 'Inventario'],
      [false, 'Panel financiero'],
      [false, 'Alertas WhatsApp'],
      [false, 'Asistente IA AVIA'],
    ],
    cta: 'Empezar gratis',
    cs: 'plan-cta-out',
    featured: false,
  },
  {
    name: 'Professional',
    desc: 'Para granjas medianas con control total',
    m: 79,
    a: 63,
    feats: [
      [true, 'Hasta 8 galpones'],
      [true, '10 usuarios'],
      [true, 'Todo de Starter'],
      [true, 'Panel financiero + ROI'],
      [true, 'Alertas WhatsApp'],
      [true, 'Reportes PDF'],
      [true, 'Comparador galpones'],
      [true, 'Asistente IA AVIA'],
    ],
    cta: 'Probar 14 días gratis',
    cs: 'plan-cta-solid',
    featured: true,
  },
  {
    name: 'Enterprise',
    desc: 'Para integradores y grandes operaciones',
    m: 199,
    a: 159,
    feats: [
      [true, 'Galpones ilimitados'],
      [true, 'Usuarios ilimitados'],
      [true, 'Todo de Pro'],
      [true, 'Multi-granja + ranking'],
      [true, 'API REST + Webhooks'],
      [true, 'IA avanzada'],
      [true, 'White-label'],
      [true, 'Soporte 24/7'],
    ],
    cta: 'Contactar ventas',
    cs: 'plan-cta-out',
    featured: false,
  },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)
  const ref = useFadeUp()

  return (
    <section id="pricing" className="pricing-section">
      <div className="max-w fade-up" ref={ref} style={{ textAlign: 'center' }}>
        <div className="section-label" style={{ justifyContent: 'center' }}>
          Precios
        </div>
        <h2 className="section-title">
          Precio colombiano.
          <br />
          <span className="grad-text">Calidad global.</span>
        </h2>
        <p className="section-sub" style={{ margin: '0 auto' }}>
          Sin sorpresas, sin hardware propietario, sin contratos forzosos.
        </p>
        <div className="pricing-toggle">
          <span className={`tog-btn ${!annual ? 'active' : ''}`} onClick={() => setAnnual(false)}>
            Mensual
          </span>
          <div className={`tog-track ${annual ? 'on' : ''}`} onClick={() => setAnnual(!annual)}>
            <div className="tog-thumb" />
          </div>
          <span className={`tog-btn ${annual ? 'active' : ''}`} onClick={() => setAnnual(true)}>
            Anual <span className="save-tag">-20%</span>
          </span>
        </div>
        <div className="pricing-cards">
          {plans.map(({ name, desc, m, a, feats, cta, cs, featured }) => (
            <div key={name} className={`price-card ${featured ? 'featured' : ''}`}>
              {featured && <div className="pop-badge">MÁS POPULAR</div>}
              <div className="plan-name">{name}</div>
              <div className="plan-desc">{desc}</div>
              <div className="plan-price" style={{ color: featured ? 'var(--green-d)' : 'var(--text)' }}>
                <sup>$</sup>
                {annual ? a : m}
                <sub>/mes</sub>
              </div>
              {annual && (
                <div className="annual-note">
                  Facturado anualmente
                </div>
              )}
              <div className="plan-divider" />
              {feats.map(([has, label]) => (
                <div key={label as string} className={`plan-feat ${!has ? 'off' : ''}`}>
                  <Ic d={has ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} size={15} style={{ color: has ? '#10b981' : '#a8b8b0' }} />
                  {label as string}
                </div>
              ))}
              <button className={`plan-cta ${cs}`}>{cta}</button>
              {featured && (
                <div className="iot-note">
                  + IoT Add-on: +$25/galpón/mes
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pricing
