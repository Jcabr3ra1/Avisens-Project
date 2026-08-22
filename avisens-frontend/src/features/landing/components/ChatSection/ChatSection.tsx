import { useFadeUp } from '@shared/hooks/useFadeUp'
import { IcRefresh, IcSend, IcSparkle } from '@shared/ui/icons/icons'
import './ChatSection.css'

function ChatSection() {
  const ref = useFadeUp()

  return (
    <section id="chatbot" className="chat-section">
      <div className="chat-inner fade-up" ref={ref}>
        <div className="chat-copy">
          <div className="section-label">Chatbot comercial</div>
          <h2 className="section-title">
            Cotiza con <span className="grad-text">AVIA</span>.
            <br />
            Sin salir de la landing.
          </h2>
          <p className="section-sub">
            El flujo de calificación de prospectos vive en el chat flotante. Esta vista
            muestra cómo se ve la experiencia antes de abrir el asistente.
          </p>

          <div className="chat-examples">
            {[
              {
                q: 'Datos de la granja',
                a: 'Recolecta tamaño, operación y necesidades principales antes de cotizar.',
              },
              {
                q: 'Calificación automática',
                a: 'Calcula un puntaje y clasifica el lead como caliente, tibio o frío.',
              },
              {
                q: 'Seguimiento claro',
                a: 'Deja listo el contexto para que ventas contacte con una ruta definida.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="chat-example">
                <div className="chat-example-q">{q}</div>
                <div className="chat-example-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-lead-window chat-lead-window--static" aria-label="Vista previa del chatbot AVIA">
          <div className="chat-lead-topbar">
            <div className="chat-lead-avatar"><IcSparkle size={16} /></div>
            <div className="chat-lead-topbar-info">
              <div className="chat-lead-name">AVIA - Asistente AVISENS</div>
              <div className="chat-lead-online">Vista previa</div>
            </div>
            <span className="chat-lead-reset" aria-hidden="true">
              <IcRefresh size={14} /> Reiniciar
            </span>
          </div>

          <div className="chat-lead-progress" aria-hidden="true">
            <div className="chat-lead-progress-track">
              <div className="chat-lead-progress-fill" style={{ width: '18%' }} />
            </div>
            <span className="chat-lead-progress-text">demo</span>
          </div>

          <div className="chat-lead-msgs">
            <div className="chat-lead-msg bot">
              <div className="chat-lead-bubble">
                ¿Autorizas el tratamiento de tus datos personales (habeas data)?
              </div>
            </div>
          </div>

          <div className="chat-lead-options">
            <span className="chat-lead-option">Sí</span>
            <span className="chat-lead-option">No</span>
          </div>

          <div className="chat-lead-input-row" aria-hidden="true">
            <div className="chat-lead-input chat-lead-input--mock">Escribe tu respuesta</div>
            <span className="chat-lead-send"><IcSend size={16} /></span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChatSection
