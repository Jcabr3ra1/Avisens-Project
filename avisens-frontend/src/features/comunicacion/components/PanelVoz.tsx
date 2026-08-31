import { FormEvent, useRef, useState } from 'react'
import { interpretarComando } from '@features/comandos-voz/api/comandos-voz'
import { IcMic, IcSend, IcSparkle } from '@shared/ui/icons/icons'

type ReconocimientoEvento = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
  resultIndex: number
}

type Reconocimiento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  abort: () => void
  onresult: ((evento: ReconocimientoEvento) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type ConstructorReconocimiento = new () => Reconocimiento

function obtenerReconocimiento() {
  const ventana = window as typeof window & {
    SpeechRecognition?: ConstructorReconocimiento
    webkitSpeechRecognition?: ConstructorReconocimiento
  }
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition
}

function PanelVoz({ galponId, galponNombre }: { galponId: number | null; galponNombre: string | null }) {
  const [comando, setComando] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState('')
  const reconocimientoRef = useRef<Reconocimiento | null>(null)

  const iniciarDictado = () => {
    const Constructor = obtenerReconocimiento()
    if (!Constructor) {
      setError('Tu navegador no permite dictado por voz. Puedes escribir el comando.')
      return
    }
    reconocimientoRef.current?.abort()
    const reconocimiento = new Constructor()
    reconocimiento.lang = 'es-CO'
    reconocimiento.interimResults = false
    reconocimiento.continuous = false
    reconocimiento.onresult = (evento) => {
      setComando(evento.results[evento.resultIndex][0]?.transcript ?? '')
    }
    reconocimiento.onerror = () => setError('No pudimos escuchar el comando. Puedes intentarlo de nuevo o escribirlo.')
    reconocimiento.onend = () => setEscuchando(false)
    reconocimientoRef.current = reconocimiento
    setError('')
    setEscuchando(true)
    reconocimiento.start()
  }

  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    if (!galponId || !comando.trim() || enviando) return
    setEnviando(true)
    setError('')
    setRespuesta('')
    try {
      const resultado = await interpretarComando({ galpon_id: galponId, comando_texto: comando.trim() })
      setRespuesta(resultado.mensaje ?? 'El comando fue registrado.')
    } catch {
      setError('No pudimos procesar el comando. Revisa el galpón seleccionado e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="comunicacion-voz" aria-labelledby="voz-title">
      <span className="comunicacion-voz__orb" aria-hidden="true"><IcMic size={38} /></span>
      <p className="comunicacion-section-label">Asistente de voz</p>
      <h3 id="voz-title">Lía está lista</h3>
      <p className="comunicacion-voz__context">{galponNombre ? `Consulta el estado de ${galponNombre}.` : 'Selecciona un galpón para consultar su estado.'}</p>

      <button type="button" className={`comunicacion-voz__mic${escuchando ? ' is-listening' : ''}`} onClick={iniciarDictado} disabled={!galponId || enviando}>
        <IcMic size={22} aria-hidden="true" />
        {escuchando ? 'Escuchando…' : 'Hablar con Lía'}
      </button>

      <p className="comunicacion-voz__hint">Puedes preguntar por temperatura o humedad.</p>
      {respuesta && <p className="comunicacion-voz__response"><IcSparkle size={18} aria-hidden="true" />{respuesta}</p>}
      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}

      <form className="comunicacion-composer" onSubmit={enviar}>
        <input value={comando} onChange={(event) => setComando(event.target.value)} placeholder="O escribe un comando…" aria-label="Comando de voz" disabled={!galponId} />
        <button type="submit" disabled={!galponId || !comando.trim() || enviando} aria-label="Procesar comando">
          <IcSend size={19} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}

export default PanelVoz
