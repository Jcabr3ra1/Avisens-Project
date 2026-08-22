import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  iniciarConversacion,
  responderPregunta,
  type PreguntaChatbot,
  type RespuestaChatbot,
} from '@shared/api/chatbot'
import { IcAlert, IcRefresh, IcSend, IcSparkle } from '@shared/ui/icons/icons'
import Ic from '@shared/ui/Ic/Ic'
import './FloatChat.css'

const TOTAL_PREGUNTAS = 19
const SIN_CONSENTIMIENTO = 'sin_consentimiento'
const PUNTAJE_MAXIMO = 16

type Mensaje = {
  autor: 'bot' | 'usuario'
  texto: string
}

type Resultado = {
  puntaje: number | null
  clasificacion: string | null
}

type ErrorChat = {
  texto: string
  reiniciar: boolean
}

function mensajeBackend(data: unknown): string {
  const cuerpo = data as { message?: string | string[]; errors?: string[] } | undefined
  const message = Array.isArray(cuerpo?.message)
    ? cuerpo.message.join(', ')
    : cuerpo?.message ?? ''
  const errors = Array.isArray(cuerpo?.errors) ? cuerpo.errors.join(', ') : ''
  return [message, errors].filter(Boolean).join(': ')
}

function traducirError(err: unknown, fallback: string): ErrorChat {
  if (!isAxiosError(err)) return { texto: fallback, reiniciar: true }

  if (!err.response) {
    return {
      texto: 'No se pudo conectar con el servidor. Revisa que la API esté arriba.',
      reiniciar: true,
    }
  }

  const { status, data } = err.response
  const mensaje = mensajeBackend(data)

  if (status === 429) {
    return {
      texto: 'Vas muy rápido para el servidor. Espera un momento y vuelve a intentarlo.',
      reiniciar: false,
    }
  }

  if (status === 400 && /no v[aá]lida/i.test(mensaje)) {
    return { texto: mensaje, reiniciar: false }
  }

  if (status === 404) {
    return { texto: 'Esta conversación ya no existe en el servidor.', reiniciar: true }
  }

  return { texto: mensaje || fallback, reiniciar: true }
}

function etiquetaClasificacion(clasificacion: string | null): string {
  if (!clasificacion) return 'Sin clasificación'
  const normalizada = clasificacion.toLowerCase()
  if (normalizada === 'frio') return 'Frío'
  return normalizada.charAt(0).toUpperCase() + normalizada.slice(1)
}

function FloatChat() {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [sesionId, setSesionId] = useState<string | null>(null)
  const [pregunta, setPregunta] = useState<PreguntaChatbot | null>(null)
  const [respondidas, setRespondidas] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorChat | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoAbierto = useRef(false)

  const aplicar = useCallback((respuesta: RespuestaChatbot, cuenta: boolean) => {
    if (cuenta) setRespondidas((n) => n + 1)

    if (respuesta.finalizado) {
      const sinConsentimiento = respuesta.clasificacion === SIN_CONSENTIMIENTO
      setPregunta(null)
      setResultado({
        puntaje: respuesta.puntaje_total,
        clasificacion: respuesta.clasificacion,
      })
      setMensajes((m) => [
        ...m,
        {
          autor: 'bot',
          texto: sinConsentimiento
            ? 'Entendido, cerramos aquí. No quedaste registrado como prospecto y no guardamos ningún dato personal tuyo.'
            : 'Listo. Con eso tengo todo lo necesario para orientar tu cotización.',
        },
      ])
      return
    }

    if (respuesta.pregunta) {
      const siguiente = respuesta.pregunta
      setPregunta(siguiente)
      setMensajes((m) => [...m, { autor: 'bot', texto: siguiente.texto }])
    }
  }, [])

  const iniciar = useCallback(async () => {
    setEnviando(true)
    setError(null)
    setMensajes([])
    setSesionId(null)
    setPregunta(null)
    setResultado(null)
    setRespondidas(0)
    setTexto('')

    try {
      const respuesta = await iniciarConversacion('web')
      setSesionId(respuesta.sesion_id)
      setIniciado(true)
      aplicar(respuesta, false)
    } catch (err) {
      setError(traducirError(err, 'No se pudo iniciar la conversación.'))
      setIniciado(false)
    } finally {
      setEnviando(false)
    }
  }, [aplicar])

  const enviar = useCallback(async (respuesta: string) => {
    const valor = respuesta.trim()
    if (!valor || !sesionId || enviando || resultado) return

    setTexto('')
    setError(null)
    setMensajes((m) => [...m, { autor: 'usuario', texto: valor }])
    setEnviando(true)

    try {
      aplicar(await responderPregunta(sesionId, valor), true)
    } catch (err) {
      const fallo = traducirError(err, 'No se pudo enviar la respuesta.')
      if (fallo.reiniciar) {
        setError(fallo)
      } else {
        setMensajes((m) => [...m, { autor: 'bot', texto: fallo.texto }])
      }
    } finally {
      setEnviando(false)
    }
  }, [aplicar, enviando, resultado, sesionId])

  function toggleChat() {
    if (!open && !iniciado && !enviando) void iniciar()
    setOpen((actual) => !actual)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void enviar(texto)
  }

  // El botón "Probar chatbot" del panel abre /?chat=1: deja el asistente
  // desplegado y con la conversación ya iniciada. El ref evita que StrictMode
  // gaste dos veces el límite de 5 inicios por minuto.
  useEffect(() => {
    if (autoAbierto.current) return
    if (!new URLSearchParams(window.location.search).has('chat')) return
    autoAbierto.current = true
    setOpen(true)
    void iniciar()
  }, [iniciar])

  useEffect(() => {
    const caja = scrollRef.current
    if (caja) caja.scrollTop = caja.scrollHeight
  }, [mensajes, enviando, resultado, open])

  useEffect(() => {
    if (open && pregunta && !enviando) inputRef.current?.focus()
  }, [open, pregunta, enviando])

  const progreso = Math.min(respondidas, TOTAL_PREGUNTAS)
  const opciones = pregunta?.opciones ?? []
  const estado = resultado
    ? resultado.clasificacion === SIN_CONSENTIMIENTO
      ? 'Conversación cerrada'
      : 'Conversación terminada'
    : enviando
      ? 'Escribiendo'
      : 'Asistente AVISENS'
  const placeholder = resultado
    ? 'La conversación terminó'
    : pregunta?.tipo === 'numero'
      ? 'Escribe un número'
      : 'Escribe tu respuesta...'

  return (
    <div className="float-chat">
      <div className={`float-panel ${open ? '' : 'hidden'}`}>
        <div className="float-chat-topbar">
          <div className="float-chat-avatar">
            <IcSparkle size={17} />
          </div>
          <div className="float-chat-heading">
            <div className="float-chat-name">AVIA</div>
            <div className="float-chat-online">{estado}</div>
          </div>
          <button
            type="button"
            className="float-chat-reset"
            onClick={iniciar}
            disabled={enviando}
            aria-label="Reiniciar conversación"
            title="Reiniciar conversación"
          >
            <IcRefresh size={15} />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="float-chat-close" aria-label="Cerrar">
            <Ic d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>

        <div className="float-chat-progress" aria-label={`Progreso ${progreso} de ${TOTAL_PREGUNTAS}`}>
          <div style={{ width: `${Math.round((progreso / TOTAL_PREGUNTAS) * 100)}%` }} />
        </div>

        <div className="float-chat-msgs" ref={scrollRef}>
          {mensajes.map((mensaje, i) => (
            <div key={`${mensaje.autor}-${i}`} className={`float-msg ${mensaje.autor}`}>
              <div className="float-msg-bub">{mensaje.texto}</div>
            </div>
          ))}

          {enviando ? (
            <div className="float-msg bot">
              <div className="float-msg-bub">
                <div className="float-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          ) : null}

          {resultado ? (
            resultado.clasificacion === SIN_CONSENTIMIENTO ? (
              <div className="float-result float-result--cerrado">
                <span>Conversación cerrada</span>
                <p>Sin tratamiento de datos. Puedes reiniciar cuando quieras.</p>
              </div>
            ) : (
              <div className="float-result">
                <span>Resultado</span>
                <strong>
                  {resultado.puntaje ?? 0}<small>/{PUNTAJE_MAXIMO}</small>
                </strong>
                <p>{etiquetaClasificacion(resultado.clasificacion)}</p>
              </div>
            )
          ) : null}
        </div>

        {error ? (
          <div className="float-chat-error">
            <IcAlert size={15} />
            <span>{error.texto}</span>
            {error.reiniciar ? (
              <button type="button" onClick={iniciar} disabled={enviando}>
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}

        {opciones.length > 0 && !resultado ? (
          <div className="float-chat-options">
            {opciones.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => void enviar(opcion)}
                disabled={enviando || !sesionId}
              >
                {opcion}
              </button>
            ))}
          </div>
        ) : null}

        <form className="float-chat-input-row" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className="float-chat-inp"
            placeholder={placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={enviando || !sesionId || resultado !== null}
          />
          <button
            type="submit"
            className="float-chat-send-btn"
            disabled={enviando || !sesionId || !texto.trim() || resultado !== null}
            aria-label="Enviar"
          >
            <IcSend size={17} />
          </button>
        </form>
      </div>

      <button className="float-btn" onClick={toggleChat} aria-label={open ? 'Cerrar chat' : 'Abrir chat'}>
        <Ic d={open ? 'M18 6L6 18M6 6l12 12' : 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'} size={22} style={{ color: '#fff' }} />
      </button>
    </div>
  )
}

export default FloatChat
