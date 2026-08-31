import type { FormEvent } from 'react'
import { IcMic, IcSend, IcSparkle } from '@shared/ui/icons/icons'
import { useComandoVoz } from '../hooks/useComandoVoz'

function PanelVoz({ galponId, galponNombre }: { galponId: number | null; galponNombre: string | null }) {
  const { comando, setComando, escuchando, enviando, respuesta, error, dictar, enviar } =
    useComandoVoz(galponId)

  function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    void enviar()
  }

  return (
    <section className="comunicacion-voz" aria-labelledby="voz-title">
      <span className="comunicacion-voz__orb" aria-hidden="true"><IcMic size={38} /></span>
      <p className="comunicacion-section-label">Asistente de voz</p>
      <h3 id="voz-title">Lía está lista</h3>
      <p className="comunicacion-voz__context">{galponNombre ? `Consulta el estado de ${galponNombre}.` : 'Selecciona un galpón para consultar su estado.'}</p>

      <button type="button" className={`comunicacion-voz__mic${escuchando ? ' is-listening' : ''}`} onClick={dictar} disabled={!galponId || enviando}>
        <IcMic size={22} aria-hidden="true" />
        {escuchando ? 'Escuchando…' : 'Hablar con Lía'}
      </button>

      <p className="comunicacion-voz__hint">Puedes preguntar por temperatura o humedad.</p>
      {respuesta && <p className="comunicacion-voz__response"><IcSparkle size={18} aria-hidden="true" />{respuesta}</p>}
      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}

      <form className="comunicacion-composer" onSubmit={alEnviar}>
        <input value={comando} onChange={(evento) => setComando(evento.target.value)} placeholder="O escribe un comando…" aria-label="Comando de voz" disabled={!galponId} />
        <button type="submit" disabled={!galponId || !comando.trim() || enviando} aria-label="Procesar comando">
          <IcSend size={19} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}

export default PanelVoz
