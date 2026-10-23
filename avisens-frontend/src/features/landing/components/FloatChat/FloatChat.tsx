import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  iniciarConversacion,
  responderPregunta,
  type PreguntaChatbot,
  type RespuestaChatbot,
  type RutaChat,
} from '@features/landing/api/chatbot'
import { IcAlert, IcSend } from '@shared/ui/icons/icons'
import logoAvisens from '@shared/assets/logo-avisens.png'
import Ic from '@shared/ui/Ic/Ic'
import { seLeenEnPar } from '@features/landing/model/opcionesChat'
import AviaBoton from './AviaBoton'
import VistaDudas from './VistaDudas'
import mascotaPoster from '../../assets/avia/avia-chat-poster.png'
import './FloatChat.css'
import './FloatChat.tema.css'

const SIN_CONSENTIMIENTO = 'sin_consentimiento'

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

// Lo que sigue tras la cotización, dicho con las mismas promesas que el cierre
// de WhatsApp. Al visitante no se le muestra su puntaje ni si es «caliente» o
// «frío»: eso es una clasificación interna de ventas, no algo que él deba leer.
const SIGUIENTE_PASO: Record<string, string> = {
  caliente:
    'Un asesor comercial te contacta en las próximas 24 horas para coordinar una visita técnica y afinar tu propuesta.',
  tibio:
    'Te invitamos a una demostración remota para que veas la plataforma funcionando y resolvamos tus dudas antes de decidir.',
  frio:
    'Te enviamos información útil sobre monitoreo y bienestar de las aves, y quedamos pendientes para cuando quieras dar el siguiente paso.',
}
const SIGUIENTE_PASO_GENERICO = 'Un asesor te contacta con la cotización.'

// Las tres puertas de entrada al asistente, como botones de la pantalla de
// inicio. Quien viene a cotizar y quien viene con un problema no buscan lo
// mismo, así que cada una arranca una ruta distinta.
const ACCIONES_RAPIDAS: { ruta: RutaChat; titulo: string }[] = [
  { ruta: 'cotizacion', titulo: 'Quiero cotizar' },
  { ruta: 'general', titulo: 'Tengo dudas primero' },
  { ruta: 'soporte', titulo: 'Ya soy cliente' },
]

function FloatChat() {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [sesionId, setSesionId] = useState<string | null>(null)
  const [pregunta, setPregunta] = useState<PreguntaChatbot | null>(null)
  // El progreso lo manda el servidor en cada respuesta. Antes se contaba aquí
  // contra una constante de 15, y la API decía 16: la barra nunca llegaba al
  // final. Duplicar el número en dos repos es lo que garantiza que se separen.
  const [progreso, setProgreso] = useState(0)
  const [totalPasos, setTotalPasos] = useState<number | null>(null)
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

  const aplicar = useCallback((respuesta: RespuestaChatbot) => {
    if (respuesta.progreso !== null) setProgreso(respuesta.progreso)
    if (respuesta.total_pasos !== null) setTotalPasos(respuesta.total_pasos)

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
            ? 'Entendido, lo dejamos aquí. No quedaste registrado y no guardé ningún dato personal tuyo.'
            : esPqrs
              ? 'Listo, tu solicitud quedó radicada. Un asesor del equipo la revisa y te contacta.'
              : 'Listo. Con lo que me contaste ya puedo orientar tu cotización.',
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
    setProgreso(0)
    setTotalPasos(null)
    setTexto('')
    setPorElegirRuta(false)

    try {
      const respuesta = await iniciarConversacion('web', ruta)
      setSesionId(respuesta.sesion_id)
      setIniciado(true)
      aplicar(respuesta)
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
    setProgreso(0)
    setTotalPasos(null)
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
      aplicar(await responderPregunta(sesionId, valor))
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

  function manejarClickAvia(evento: MouseEvent<HTMLButtonElement>) {
    // Un doble clic no debe abrir y cerrar el chat. Teclado y clic sencillo
    // siguen respondiendo de inmediato; AVIA no tiene interacción de vuelo.
    if (evento.detail > 1) return
    if (open) {
      cerrarChat()
      return
    }

    if (!iniciado && !enviando && !porElegirRuta) abrirConMenu()
    setOpen(true)
  }

  useEffect(() => {
    const abrirDesdeLaPagina = (evento: Event) => {
      const ruta = (evento as CustomEvent<{ ruta?: RutaChat }>).detail?.ruta
      setOpen(true)
      if (ruta && !enviando && (porElegirRuta || !iniciado)) {
        void iniciar(ruta)
        return
      }
      if (!iniciado && !enviando && !porElegirRuta) abrirConMenu()
    }
    window.addEventListener('avisens:abrir-chat', abrirDesdeLaPagina)
    return () => window.removeEventListener('avisens:abrir-chat', abrirDesdeLaPagina)
  }, [abrirConMenu, enviando, iniciado, iniciar, porElegirRuta])

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

  const opciones = pregunta?.opciones ?? []
  const enDudas = pregunta?.codigo === 'BMP' && !resultado
  const enPar = seLeenEnPar(opciones)
  // La identidad («Asistente AVISENS») es fija y va en su propia línea; el
  // estado cambia. Antes compartían sitio, así que en cuanto AVIA escribía
  // desaparecía el nombre del producto.
  const estado = resultado
    ? 'Conversación terminada'
    : enviando
      ? 'Escribiendo…'
      : 'En línea ahora'
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
        {porElegirRuta ? (
          <div className="float-inicio">
            <div className="float-inicio-hero">
              <div className="float-inicio-barra">
                <img className="float-inicio-mascota" src={mascotaPoster} alt="" width={84} height={84} />
                <button type="button" onClick={cerrarChat} className="float-chat-close" aria-label="Cerrar chat">
                  <Ic d="M18 6L6 18M6 6l12 12" size={16} />
                </button>
              </div>
              <h2 className="float-inicio-saludo" id="avia-chat-title">
                <span>Hola, soy AVIA</span>
                ¿En qué te ayudo?
              </h2>
            </div>
            <div className="float-inicio-acciones">
              {ACCIONES_RAPIDAS.map((accion) => (
                <button
                  key={accion.ruta}
                  type="button"
                  className="float-inicio-boton"
                  onClick={() => void iniciar(accion.ruta)}
                >
                  <span>{accion.titulo}</span>
                  <Ic d="M5 12h14M13 6l6 6-6 6" size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
        <div className="float-chat-topbar">
          <img className="float-chat-logo" src={logoAvisens} alt="" width={40} height={40} />
          <div className="float-chat-heading">
            <div className="float-chat-name" id="avia-chat-title">AVIA</div>
            <div className="float-chat-tagline">Asistente AVISENS</div>
            <div
              className={`float-chat-online${resultado ? ' float-chat-online--fin' : ''}`}
              aria-live="polite"
            >
              {estado}
            </div>
          </div>
          <button
            type="button"
            className="float-chat-reset"
            onClick={() => abrirConMenu()}
            disabled={enviando}
            aria-label="Volver al inicio"
            title="Volver al inicio"
          >
            <Ic d="M15 18l-6-6 6-6" size={16} />
          </button>
          <button type="button" onClick={cerrarChat} className="float-chat-close" aria-label="Cerrar chat">
            <Ic d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>

        {enDudas && pregunta ? (
          <VistaDudas
            titulo={pregunta.texto}
            opciones={opciones}
            deshabilitado={enviando || !sesionId}
            error={error?.texto ?? null}
            onElegir={(opcion) => void enviar(opcion)}
          />
        ) : (
          <>
        {/* Sin total no se dibuja nada: una barra que divide por un número
            inventado miente con aspecto de dato. */}
        {totalPasos !== null && totalPasos > 0 && (
          <div
            className="float-chat-progress"
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={totalPasos}
            aria-label={`Pregunta ${progreso} de ${totalPasos}`}
          >
            <div style={{ width: `${Math.min(Math.round((progreso / totalPasos) * 100), 100)}%` }} />
          </div>
        )}

        <div className="float-chat-msgs" ref={scrollRef}>
          {mensajes.map((mensaje, i) =>
            mensaje.autor === 'bloque' ? (
              <div key={`bloque-${i}`} className="float-bloque" role="separator">
                <span>{mensaje.texto}</span>
              </div>
            ) : (
              <div key={`${mensaje.autor}-${i}`} className={`float-msg ${mensaje.autor}`}>
                {mensaje.autor === 'bot' ? <img className="float-msg-logo" src={logoAvisens} alt="" width={26} height={26} /> : null}
                <div className="float-msg-bub">{mensaje.texto}</div>
              </div>
            ),
          )}

          {enviando ? (
            <div className="float-msg bot">
              <img className="float-msg-logo" src={logoAvisens} alt="" width={26} height={26} />
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
                <p>Si quieres acompañamiento, reinicia y elige «Solicitar acompañamiento».</p>
              </div>
            ) : (
              <div className={`float-result float-result--${resultado.clasificacion ?? 'frio'}`}>
                <span>Lo que sigue</span>
                <p>{SIGUIENTE_PASO[resultado.clasificacion ?? ''] ?? SIGUIENTE_PASO_GENERICO}</p>
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

          {opciones.length > 0 && !resultado ? (
          <div className={`float-chat-options${enPar ? ' float-chat-options--par' : ''}`}>
            {/* Un sí o no se responde de un vistazo: en pareja y horizontal se
                lee como una decisión, mientras que apilado a lo ancho parece
                una lista de la que hay que escoger. Es también como los pinta
                WhatsApp, que usa botones hasta tres opciones y lista a partir
                de ahí, así que los dos canales se leen igual. */}
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
          </>
        )}
          </>
        )}
      </div>

      <button
        ref={triggerRef}
        className="float-btn"
        type="button"
        onClick={manejarClickAvia}
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
            <AviaBoton size={112} className="float-btn-robot" />
          )}
        </span>
      </button>
    </div>
  )
}

export default FloatChat
