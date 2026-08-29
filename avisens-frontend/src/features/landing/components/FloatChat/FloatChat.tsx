import { Suspense, lazy, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  iniciarConversacion,
  responderPregunta,
  type PreguntaChatbot,
  type RespuestaChatbot,
  type RutaChat,
} from '@shared/api/chatbot'
import { IcAlert, IcRefresh, IcSend } from '@shared/ui/icons/icons'
import Ic from '@shared/ui/Ic/Ic'
import './FloatChat.css'

const RobotLottie = lazy(() => import('./RobotLottie'))

// El cuestionario son 15 pasos y el puntaje comercial llega a 12. Estaban en
// 20 y 16 desde antes del rediseño: el resultado mostraba "12/16" y la barra de
// progreso se quedaba corta.
const TOTAL_PREGUNTAS = 15
const SIN_CONSENTIMIENTO = 'sin_consentimiento'
const PUNTAJE_MAXIMO = 12

type Mensaje = {
  autor: 'bot' | 'usuario' | 'bloque'
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
      texto: 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.',
      reiniciar: true,
    }
  }

  const { status, data } = err.response
  const mensaje = mensajeBackend(data)

  if (status === 429) {
    return {
      texto: 'Vas muy rápido. Espera un momento y vuelve a intentarlo.',
      reiniciar: false,
    }
  }

  if (status === 400 && /no v[aá]lida/i.test(mensaje)) {
    return { texto: mensaje, reiniciar: false }
  }

  if (status === 404) {
    return { texto: 'Esta conversación ya no existe. Empecemos una nueva.', reiniciar: true }
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
  const [porElegirRuta, setPorElegirRuta] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const autoAbierto = useRef(false)

  const aplicar = useCallback((respuesta: RespuestaChatbot, cuenta: boolean) => {
    if (cuenta) setRespondidas((n) => n + 1)

    if (respuesta.finalizado) {
      const sinConsentimiento = respuesta.clasificacion === SIN_CONSENTIMIENTO
      const esPqrs = respuesta.clasificacion === 'pqrs'
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
            : esPqrs
              ? '¡Listo! Tu solicitud quedó radicada. Un asesor del equipo la revisará y te contactará.'
              : 'Listo. Con eso tengo todo lo necesario para orientar tu cotización.',
        },
      ])
      return
    }

    if (respuesta.pregunta) {
      const siguiente = respuesta.pregunta
      setPregunta(siguiente)
      setMensajes((m) => [
        ...m,
        // El backend anuncia cada tanda ("Tu granja - 3 preguntas"). Se pinta
        // como separador y no como mensaje del bot: da estructura sin sumar
        // una burbuja mas que leer.
        ...(respuesta.mensaje_transicion
          ? [{ autor: 'bloque' as const, texto: respuesta.mensaje_transicion }]
          : []),
        { autor: 'bot' as const, texto: siguiente.texto },
      ])
    }
  }, [])

  const iniciar = useCallback(async (ruta: RutaChat = 'cotizacion') => {
    setEnviando(true)
    setError(null)
    setMensajes([])
    setSesionId(null)
    setPregunta(null)
    setResultado(null)
    setRespondidas(0)
    setTexto('')
    setPorElegirRuta(false)

    try {
      const respuesta = await iniciarConversacion('web', ruta)
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

  const abrirConMenu = useCallback(() => {
    setMensajes([])
    setSesionId(null)
    setPregunta(null)
    setResultado(null)
    setRespondidas(0)
    setTexto('')
    setError(null)
    setPorElegirRuta(true)
  }, [])

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

  const cerrarChat = useCallback(() => {
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  function toggleChat() {
    if (open) {
      cerrarChat()
      return
    }

    if (!iniciado && !enviando && !porElegirRuta) abrirConMenu()
    setOpen(true)
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
    void iniciar('cotizacion')
  }, [iniciar])

  useEffect(() => {
    const caja = scrollRef.current
    if (caja) caja.scrollTop = caja.scrollHeight
  }, [mensajes, enviando, resultado, open])

  useEffect(() => {
    if (open && pregunta && !enviando) inputRef.current?.focus()
  }, [open, pregunta, enviando])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cerrarChat()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cerrarChat, open])

  const progreso = Math.min(respondidas, TOTAL_PREGUNTAS)
  const opciones = pregunta?.opciones ?? []
  const estado = resultado
    ? resultado.clasificacion === SIN_CONSENTIMIENTO || resultado.clasificacion === 'pqrs'
      ? 'Conversación terminada'
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
    <div className={`float-chat${open ? ' is-open' : ''}`}>
      <div
        id="avia-chat-panel"
        className={`float-panel ${open ? '' : 'hidden'}`}
        aria-hidden={!open}
        aria-labelledby="avia-chat-title"
      >
        <div className="float-chat-topbar">
          <div className="float-chat-avatar">
            <Suspense fallback={null}>
              <RobotLottie size={30} animando={enviando} />
            </Suspense>
          </div>
          <div className="float-chat-heading">
            <div className="float-chat-name" id="avia-chat-title">AVIA</div>
            <div className="float-chat-online" aria-live="polite">{estado}</div>
          </div>
          <button
            type="button"
            className="float-chat-reset"
            onClick={() => abrirConMenu()}
            disabled={enviando}
            aria-label="Reiniciar conversación"
            title="Reiniciar conversación"
          >
            <IcRefresh size={15} />
          </button>
          <button type="button" onClick={cerrarChat} className="float-chat-close" aria-label="Cerrar chat">
            <Ic d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>

        <div className="float-chat-progress" aria-label={`Progreso ${progreso} de ${TOTAL_PREGUNTAS}`}>
          <div style={{ width: `${Math.round((progreso / TOTAL_PREGUNTAS) * 100)}%` }} />
        </div>

        <div className="float-chat-msgs" ref={scrollRef}>
          {porElegirRuta ? (
            <div className="float-msg bot">
              <div className="float-msg-bub">
                ¡Hola! Soy AVIA. ¿En qué te puedo ayudar hoy?
              </div>
            </div>
          ) : null}

          {mensajes.map((mensaje, i) =>
            mensaje.autor === 'bloque' ? (
              <div key={`bloque-${i}`} className="float-bloque" role="separator">
                <span>{mensaje.texto}</span>
              </div>
            ) : (
              <div key={`${mensaje.autor}-${i}`} className={`float-msg ${mensaje.autor}`}>
                <div className="float-msg-bub">{mensaje.texto}</div>
              </div>
            ),
          )}

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
            ) : resultado.clasificacion === 'pqrs' ? (
              <div className="float-result float-result--cerrado">
                <span>Solicitud radicada</span>
                <p>Guarda tu número de radicado para hacerle seguimiento.</p>
              </div>
            ) : resultado.clasificacion === 'consulta_atendida' ? (
              <div className="float-result float-result--cerrado">
                <span>Consulta resuelta</span>
                <p>Si quieres una cotización, reinicia y elige «Quiero cotizar».</p>
              </div>
            ) : (
              <div className={`float-result float-result--${resultado.clasificacion ?? 'frio'}`}>
                <span>Tu perfil</span>
                <strong>{etiquetaClasificacion(resultado.clasificacion)}</strong>
                <div
                  className="float-result-barra"
                  role="img"
                  aria-label={`${resultado.puntaje ?? 0} de ${PUNTAJE_MAXIMO} puntos`}
                >
                  <div
                    style={{
                      width: `${Math.round(((resultado.puntaje ?? 0) / PUNTAJE_MAXIMO) * 100)}%`,
                    }}
                  />
                </div>
                <p>Un asesor te contactará con la cotización.</p>
              </div>
            )
          ) : null}
        </div>

        {error ? (
          <div className="float-chat-error">
            <IcAlert size={15} />
            <span>{error.texto}</span>
            {error.reiniciar ? (
              <button type="button" onClick={() => void iniciar('cotizacion')} disabled={enviando}>
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}

          {porElegirRuta && !enviando ? (
            <div className="float-chat-options">
              <button type="button" onClick={() => void iniciar('cotizacion')}>
                Quiero cotizar
              </button>
              <button type="button" onClick={() => void iniciar('general')}>
                Tengo dudas primero
              </button>
              <button type="button" onClick={() => void iniciar('soporte')}>
                Ya soy cliente y tengo un problema
              </button>
            </div>
          ) : opciones.length > 0 && !resultado ? (
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
            aria-label="Escribe tu respuesta para AVIA"
            placeholder={placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            inputMode={pregunta?.tipo === 'numero' ? 'numeric' : 'text'}
            disabled={enviando || !sesionId || resultado !== null || porElegirRuta}
          />
          <button
            type="submit"
            className="float-chat-send-btn"
            disabled={enviando || !sesionId || !texto.trim() || resultado !== null || porElegirRuta}
            aria-label="Enviar"
          >
            <IcSend size={17} />
          </button>
        </form>
      </div>

      <button
        ref={triggerRef}
        className="float-btn"
        type="button"
        onClick={toggleChat}
        aria-label={open ? 'Cerrar chat con AVIA' : 'Hablar con AVIA'}
        data-tip={open ? 'Cerrar' : 'Hablar con AVIA'}
        aria-controls="avia-chat-panel"
        aria-expanded={open}
      >
        <span className="float-btn-icon" aria-hidden="true">
          {open ? (
            <span className="float-btn-cerrar">
              <Ic d="M18 6L6 18M6 6l12 12" size={22} />
            </span>
          ) : (
            <Suspense
              fallback={
                <Ic d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={26} />
              }
            >
              <RobotLottie size={130} className="float-btn-robot" />
            </Suspense>
          )}
        </span>
      </button>
    </div>
  )
}

export default FloatChat
