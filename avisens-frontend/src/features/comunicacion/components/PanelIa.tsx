import { useState, type FormEvent } from 'react'
import { IcSend, IcSparkle } from '@shared/ui/icons/icons'
import { useCopiloto } from '../hooks/useCopiloto'
import { SUGERENCIAS_COPILOTO } from '../model/comunicacion'

function PanelIa({ puedeUsarCopiloto }: { puedeUsarCopiloto: boolean }) {
  const { mensajes, enviando, error, preguntar } = useCopiloto()
  const [borrador, setBorrador] = useState('')

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const pregunta = borrador
    setBorrador('')
    await preguntar(pregunta)
  }

  if (!puedeUsarCopiloto) {
    return (
      <section className="comunicacion-empty" aria-labelledby="ia-no-disponible-title">
        <span className="comunicacion-empty__icon" aria-hidden="true"><IcSparkle size={28} /></span>
        <h3 id="ia-no-disponible-title">Lía está disponible para propietarios</h3>
        <p>La vista de operario puede consultar el estado del galpón con Voz. Las preguntas de análisis quedan a cargo del propietario.</p>
      </section>
    )
  }

  return (
    <section className="comunicacion-ia" aria-labelledby="lia-title">
      <div className="comunicacion-ia__intro">
        <span aria-hidden="true"><IcSparkle size={25} /></span>
        <div>
          <h3 id="lia-title">Lía, asistente de producción</h3>
          <p>Pregúntale por el estado de tu producción.</p>
        </div>
      </div>

      <div className="comunicacion-ia__messages" aria-live="polite">
        {mensajes.length === 0 && (
          <p className="comunicacion-ia__welcome">Estoy lista para ayudarte a entender lo que ocurre en tus lotes, galpones y alertas.</p>
        )}
        {mensajes.map((item) => (
          <p key={item.id} className={`comunicacion-message comunicacion-message--${item.autor}`}>{item.contenido}</p>
        ))}
      </div>

      <div className="comunicacion-ia__suggestions" aria-label="Preguntas sugeridas">
        {SUGERENCIAS_COPILOTO.map((sugerencia) => (
          <button key={sugerencia} type="button" onClick={() => setBorrador(sugerencia)}>{sugerencia}</button>
        ))}
      </div>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}
      <form className="comunicacion-composer" onSubmit={(e) => void enviar(e)}>
        <input value={borrador} onChange={(evento) => setBorrador(evento.target.value)} placeholder="Pregúntale a Lía…" aria-label="Pregunta para Lía" />
        <button type="submit" disabled={!borrador.trim() || enviando} aria-label="Enviar pregunta">
          <IcSend size={19} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}

export default PanelIa
