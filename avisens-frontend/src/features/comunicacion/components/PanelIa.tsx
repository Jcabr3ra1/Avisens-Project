import { FormEvent, useState } from 'react'
import { preguntarAlCopiloto } from '@features/copiloto/api/copiloto'
import { IcSend, IcSparkle } from '@shared/ui/icons/icons'

type Mensaje = {
  id: string
  autor: 'lia' | 'usuario'
  contenido: string
}

function PanelIa({ puedeUsarCopiloto }: { puedeUsarCopiloto: boolean }) {
  const [conversacionId, setConversacionId] = useState<number | undefined>()
  const [mensaje, setMensaje] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    const pregunta = mensaje.trim()
    if (!pregunta || enviando) return

    const mensajeUsuario = { id: `u-${Date.now()}`, autor: 'usuario' as const, contenido: pregunta }
    setMensajes((actuales) => [...actuales, mensajeUsuario])
    setMensaje('')
    setEnviando(true)
    setError('')
    try {
      const respuesta = await preguntarAlCopiloto({ pregunta, conversacion_id: conversacionId })
      setConversacionId(respuesta.conversacion_id)
      setMensajes((actuales) => [...actuales, {
        id: `ia-${respuesta.conversacion_id}-${Date.now()}`,
        autor: 'lia',
        contenido: respuesta.respuesta,
      }])
    } catch {
      setError('No pudimos consultar a Lía. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
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
        {['Resume las alertas activas', '¿Cómo va mi producción?', '¿Qué debo revisar hoy?'].map((sugerencia) => (
          <button key={sugerencia} type="button" onClick={() => setMensaje(sugerencia)}>{sugerencia}</button>
        ))}
      </div>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}
      <form className="comunicacion-composer" onSubmit={enviar}>
        <input value={mensaje} onChange={(event) => setMensaje(event.target.value)} placeholder="Pregúntale a Lía…" aria-label="Pregunta para Lía" />
        <button type="submit" disabled={!mensaje.trim() || enviando} aria-label="Enviar pregunta">
          <IcSend size={19} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}

export default PanelIa
