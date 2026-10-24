import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  iniciarConversacion,
  responderPregunta,
  type PreguntaChatbot,
  type RespuestaChatbot,
  type RutaChat,
} from '@features/landing/api/chatbot'
import { IcAlert } from '@shared/ui/icons/icons'
import Ic from '@shared/ui/Ic/Ic'
import AviaBoton from './AviaBoton'
import VistaDudas from './VistaDudas'
import VistaFin from './VistaFin'
import VistaPaso from './VistaPaso'
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

// Los pasos del soporte son fijos: cédula, qué pasa y el relato.
const PASOS_SOPORTE: Record<string, string> = { S1: 'Paso 1 de 3', S2: 'Paso 2 de 3', S3: 'Paso 3 de 3' }

// El servidor escribe con las marcas de WhatsApp (*negrita*): en el widget no
// se interpretan y se verían los asteriscos.
const sinMarcas = (texto: string) => texto.replace(/\*/g, '')

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
  const [ruta, setRuta] = useState<RutaChat>('cotizacion')
  const [aviso, setAviso] = useState<string | null>(null)
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
          texto: respuesta.mensaje_transicion
            ? sinMarcas(respuesta.mensaje_transicion)
            : sinConsentimiento
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

  const iniciar = useCallback(async (rutaElegida: RutaChat = 'cotizacion') => {
    setRuta(rutaElegida)
    setEnviando(true)
    setError(null)
    setAviso(null)
    setMensajes([])
    setSesionId(null)
    setPregunta(null)
    setResultado(null)
    setProgreso(0)
    setTotalPasos(null)
    setTexto('')
    setPorElegirRuta(false)

    try {
      const respuesta = await iniciarConversacion('web', rutaElegida)
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
    setAviso(null)
    setPorElegirRuta(true)
  }, [])

  const enviar = useCallback(async (respuesta: string) => {
    const valor = respuesta.trim()
    if (!valor || !sesionId || enviando || resultado) return

    setTexto('')
    setError(null)
    setAviso(null)
    setMensajes((m) => [...m, { autor: 'usuario', texto: valor }])
    setEnviando(true)

    try {
      aplicar(await responderPregunta(sesionId, valor))
    } catch (err) {
      const fallo = traducirError(err, 'No se pudo enviar la respuesta.')
      if (fallo.reiniciar) {
        setError(fallo)
      } else {
        setAviso(fallo.texto)
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
      const rutaPedida = (evento as CustomEvent<{ ruta?: RutaChat }>).detail?.ruta
      setOpen(true)
      if (rutaPedida && !enviando && (porElegirRuta || !iniciado)) {
        void iniciar(rutaPedida)
        return
      }
      if (!iniciado && !enviando && !porElegirRuta) abrirConMenu()
    }
    window.addEventListener('avisens:abrir-chat', abrirDesdeLaPagina)
    return () => window.removeEventListener('avisens:abrir-chat', abrirDesdeLaPagina)
  }, [abrirConMenu, enviando, iniciado, iniciar, porElegirRuta])

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
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cerrarChat()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cerrarChat, open])

  const opciones = pregunta?.opciones ?? []
  const enDudas = pregunta?.codigo === 'BMP' && !resultado
  const ultimo = mensajes[mensajes.length - 1]
  const anterior = mensajes[mensajes.length - 2]
  const bloqueActual = ultimo?.autor === 'bot' && anterior?.autor === 'bloque' ? sinMarcas(anterior.texto) : null
  const mensajeFinal = [...mensajes].reverse().find((mensaje) => mensaje.autor === 'bot')?.texto ?? null
  const progresoTexto = !pregunta
    ? null
    : ruta === 'cotizacion' && totalPasos
      ? `Pregunta ${Math.min(progreso + 1, totalPasos)} de ${totalPasos}`
      : ruta === 'soporte'
        ? PASOS_SOPORTE[pregunta.codigo] ?? null
        : null
  const conBarra = ruta === 'cotizacion' && totalPasos !== null && totalPasos > 0 && !resultado
  // La identidad («Asistente AVISENS») es fija y va en su propia línea; el
  // estado cambia. Antes compartían sitio, así que en cuanto AVIA escribía
  // desaparecía el nombre del producto.
  const estado = resultado
    ? 'Conversación terminada'
    : enviando
      ? 'Escribiendo…'
      : 'En línea ahora'

  return (
    <div className={`float-chat${open ? ' is-open' : ''}`}>
      <div
        id="avia-chat-panel"
        data-lenis-prevent
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
          <img className="float-chat-mascota" src={mascotaPoster} alt="" width={46} height={46} />
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

        {conBarra && totalPasos !== null && (
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

        {resultado ? (
          <VistaFin
            mensaje={mensajeFinal}
            clasificacion={resultado.clasificacion}
            onInicio={abrirConMenu}
          />
        ) : enDudas && pregunta ? (
          <VistaDudas
            titulo={pregunta.texto}
            opciones={opciones}
            deshabilitado={enviando || !sesionId}
            error={error?.texto ?? null}
            onElegir={(opcion) => void enviar(opcion)}
          />
        ) : pregunta ? (
          <VistaPaso
            pregunta={pregunta}
            bloque={bloqueActual}
            paso={progresoTexto}
            enviando={enviando || !sesionId}
            aviso={aviso}
            texto={texto}
            onTexto={setTexto}
            onEnviar={(valor) => void enviar(valor)}
          />
        ) : (
          <div className="float-paso float-paso--espera">
            {enviando ? <div className="float-dots" role="status" aria-label="AVIA está escribiendo"><span /><span /><span /></div> : null}
            {error ? (
              <div className="float-chat-error">
                <IcAlert size={15} />
                <span>{error.texto}</span>
                {error.reiniciar ? (
                  <button type="button" onClick={() => void iniciar(ruta)} disabled={enviando}>
                    Reintentar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
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
