import { useState } from 'react'
import { useFadeUp } from '@shared/hooks/useFadeUp'
import Ic from '@shared/ui/Ic/Ic'
import './FAQ.css'

const faqs = [
  { q: '¿Necesito conocimientos técnicos para usar AVISENS?', a: 'No. AVISENS fue diseñado para que cualquier avicultor lo use desde el día 1. El asistente AVIA también te guía durante el onboarding paso a paso.' },
  { q: '¿Qué pasa si no tengo internet en mi granja?', a: 'AVISENS funciona offline: los datos se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión.' },
  { q: '¿Cómo se instalan los sensores IoT?', a: 'El kit incluye ESP32 y sensores de temperatura, humedad, CO₂ y amoníaco. La instalación toma menos de 2 horas por galpón y no requiere técnico especializado.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin contratos de permanencia. Cancela desde tu panel sin penalidades. Tus datos quedan disponibles para descarga por 30 días.' },
  { q: '¿AVIA tiene acceso a los datos reales de mi granja?', a: 'Sí. AVIA está conectado en tiempo real a todos tus sensores, alertas, inventario y ciclos de crecimiento. Responde con tus datos, no con respuestas genéricas.' },
  { q: '¿AVISENS funciona fuera de Colombia?', a: 'AVISENS está diseñado para LATAM. Operamos en Colombia con expansión planificada a Ecuador, Perú y México en 2026.' },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useFadeUp()

  return (
    <section id="faq" className="faq-section">
      <div className="max-w fade-up" ref={ref} style={{ textAlign: 'center' }}>
        <div className="section-label" style={{ justifyContent: 'center' }}>
          FAQ
        </div>
        <h2 className="section-title">Preguntas frecuentes</h2>
        <div className="faq-list">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
              <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
                {q}
                <div className="faq-ic">
                  <Ic d="M12 5v14M5 12h14" size={11} />
                </div>
              </div>
              <div className="faq-a">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
