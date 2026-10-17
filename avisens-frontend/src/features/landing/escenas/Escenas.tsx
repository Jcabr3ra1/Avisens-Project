import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import '@fontsource-variable/oswald'
import { useFocoAtrapado } from '@shared/ui/Modal/useFocoAtrapado'
import logoAvisens from '@shared/assets/logo-avisens.png'
import { IcAlert, IcArrowRight, IcCheck, IcClose } from '@shared/ui/icons/icons'
import Footer from '../components/Footer/Footer'
import { beneficios, fotos, inicio, mision, problema, producto, videos } from '../model/historia'
import { useEscenas } from './useEscenas'
import AnimacionLottie from './AnimacionLottie'
import { irAPosicion, irASeccion, useScrollSuave } from './useScrollSuave'
import { useEntradas } from './useEntradas'
import './Escenas.css'

const variable = (nombre: string, valor: number | string) => ({ [nombre]: valor }) as CSSProperties

const CAPITULOS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'producto', label: 'Cómo funciona' },
  { id: 'beneficios', label: 'Lo que ganas' },
  { id: 'mision', label: 'Lo que buscamos' },
] as const

function Garabato({ className }: { className?: string }) {
  return (
    <svg className={`esc-garabato ${className ?? ''}`} viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 14 C 30 2, 48 22, 78 12 S 128 4, 152 14 S 206 22, 232 10 S 280 6, 298 13" pathLength={1} />
    </svg>
  )
}

function Topografia() {
  return (
    <svg className="esc-topo" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M-40 620 C 160 540, 260 700, 460 640 S 760 520, 900 600 S 1180 700, 1260 640" />
      <path d="M-40 520 C 140 460, 300 600, 480 540 S 780 420, 940 500 S 1160 580, 1260 520" />
      <path d="M760 180 C 860 120, 1000 140, 1040 230 S 980 400, 860 380 S 700 300, 760 180 Z" />
      <path d="M800 210 C 870 170, 970 185, 995 245 S 950 350, 870 340 S 760 290, 800 210 Z" />
      <path d="M840 240 C 880 220, 930 230, 945 262 S 920 315, 880 310 S 820 280, 840 240 Z" />
      <path d="M120 120 C 240 40, 420 90, 440 200 S 330 360, 200 330 S 40 220, 120 120 Z" />
      <path d="M170 150 C 250 100, 370 130, 385 205 S 310 300, 220 285 S 110 220, 170 150 Z" />
      <path d="M-40 760 C 200 700, 380 790, 600 740 S 960 660, 1260 760" />
      <path d="M-40 300 C 60 380, 40 470, 160 470 S 360 400, 520 430" />
    </svg>
  )
}

function Mosaico({ claseExtra }: { claseExtra?: string }) {
  return (
    <div className={`esc-mosaico ${claseExtra ?? ''}`} aria-hidden="true">
      <div className="esc-mosaico-columna esc-mosaico-columna--a">
        <img src={fotos.avicultor} alt="" />
        <img src={fotos.aves} alt="" />
        <img src={fotos.comunidad} alt="" />
      </div>
      <div className="esc-mosaico-columna esc-mosaico-columna--b">
        <img src={fotos.comunidad} alt="" style={{ objectPosition: '30% 50%' }} />
        <img src={fotos.avicultor} alt="" style={{ objectPosition: '50% 20%' }} />
        <img src={fotos.aves} alt="" style={{ objectPosition: '70% 50%' }} />
      </div>
    </div>
  )
}

function capituloActual(): string {
  const centro = window.innerHeight / 2
  const visible = CAPITULOS.find(({ id }) => {
    const caja = document.getElementById(id)?.getBoundingClientRect()
    return caja && caja.top <= centro && caja.bottom > centro
  })
  return visible?.id ?? 'inicio'
}

function MenuIndice({ onCerrar }: { onCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const [actual] = useState(capituloActual)
  useFocoAtrapado(panel, true, onCerrar)

  function ir(id: string) {
    onCerrar()
    window.setTimeout(() => irASeccion(id), 350)
  }

  return createPortal(
    <motion.div
      ref={panel}
      className="esc-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Índice de la página"
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: 'inset(0 0 0% 0)' }}
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.95, ease: [0.77, 0, 0.175, 1] }}
    >
      <Topografia />
      <Mosaico claseExtra="esc-mosaico--menu" />
      <div className="esc-menu-esquinas">
        <span className="esc-marca"><img src={logoAvisens} alt="" width={48} height={48} /></span>
        <div className="esc-esquina-acciones">
          <Link to="/login" className="esc-acceso">Iniciar sesión <span className="esc-acceso-icono" aria-hidden="true"><IcArrowRight size={16} /></span></Link>
          <button type="button" className="esc-boton-cuadro" onClick={onCerrar} aria-label="Cerrar menú"><IcClose size={20} /></button>
        </div>
      </div>
      <nav className="esc-menu-lista" aria-label="Capítulos">
        {CAPITULOS.map((capitulo, indice) => (
          <motion.button
            key={capitulo.id}
            type="button"
            className={capitulo.id === actual ? 'is-actual' : undefined}
            aria-current={capitulo.id === actual ? 'location' : undefined}
            onClick={() => ir(capitulo.id)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 + indice * 0.08, ease: [0.23, 1, 0.32, 1] }}
          >
            {capitulo.label}
            <Garabato />
          </motion.button>
        ))}
        <span className="esc-emblema">Gestión avícola · Colombia · desde 2026</span>
      </nav>
    </motion.div>,
    document.body,
  )
}

function Esquinas() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  return (
    <>
      <div className="esc-esquinas">
        <a href="#inicio" className="esc-marca" aria-label="Avisens, ir al inicio">
          <img src={logoAvisens} alt="" width={48} height={48} />
        </a>
        <div className="esc-esquina-acciones">
          <Link to="/login" className="esc-acceso">Iniciar sesión <span className="esc-acceso-icono" aria-hidden="true"><IcArrowRight size={16} /></span></Link>
          <button type="button" className="esc-boton-cuadro" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" aria-expanded={menuAbierto}>
            <span className="esc-hamburguesa" aria-hidden="true"><span /><span /></span>
          </button>
        </div>
      </div>
      <AnimatePresence>{menuAbierto && <MenuIndice onCerrar={() => setMenuAbierto(false)} />}</AnimatePresence>
    </>
  )
}

function VideoFondo({ video, velocidad = .6, pausado = false, id }: { video: (typeof videos)[keyof typeof videos]; velocidad?: number; pausado?: boolean; id?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.defaultPlaybackRate = velocidad
    video.playbackRate = velocidad
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const actualizar = () => {
      if (visible && !document.hidden && !reducir.matches && !pausado) void video.play().catch(() => undefined)
      else video.pause()
    }
    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada?.isIntersecting ?? false
      actualizar()
    })
    observador.observe(video)
    document.addEventListener('visibilitychange', actualizar)
    reducir.addEventListener('change', actualizar)
    actualizar()
    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', actualizar)
      reducir.removeEventListener('change', actualizar)
      video.pause()
    }
  }, [velocidad, pausado])

  return (
    <video id={id} ref={ref} muted loop playsInline preload="metadata" poster={video.poster} aria-hidden="true" tabIndex={-1}>
      <source src={video.hevc} type='video/mp4; codecs="hvc1"' />
      <source src={video.h264} type="video/mp4" />
    </video>
  )
}

function abrirAvia(ruta?: 'cotizacion' | 'general') {
  window.dispatchEvent(new CustomEvent('avisens:abrir-chat', { detail: { ruta } }))
}

function Inicio() {
  const palabras = inicio.frase.split(' ')
  return (
    <section id="inicio" className="esc esc-inicio" data-scene data-theme="noche" style={variable('--len', 200)}>
      <div className="esc-escenario" data-scene-exit>
        <div className="esc-inicio-medio">
          <VideoFondo video={videos.inicio} />
        </div>
        <div className="esc-inicio-titulo">
          <h1>{inicio.titulo[0]} <em>{inicio.titulo[1]}</em></h1>
          <p className="esc-inicio-promesa">{inicio.bajada}</p>
          <div className="esc-acciones esc-acciones--inicio">
            <button type="button" className="esc-boton esc-boton--maiz" onClick={() => abrirAvia('cotizacion')}>Cotiza tu granja con AVIA <IcArrowRight size={18} /></button>
            <a className="esc-boton esc-boton--claro" href="#problema">Ver cómo funciona</a>
          </div>
        </div>
        <blockquote className="esc-inicio-frase">
          <p aria-hidden="true">
            {palabras.map((palabra, indice) => (
              <span key={`${palabra}-${indice}`} style={variable('--i', indice)}>{palabra} </span>
            ))}
          </p>
          <span className="sr-only">{inicio.frase}</span>
        </blockquote>
      </div>
    </section>
  )
}

function LineaMomentos({ momentos, tramos, etiqueta }: {
  momentos: ReadonlyArray<{ cuando: string; texto: string }>
  tramos: readonly string[]
  etiqueta: string
}) {
  const ir = (boton: HTMLElement, desde: number) => {
    const seccion = boton.closest<HTMLElement>('[data-scene]')
    if (!seccion) return
    const inicio = seccion.getBoundingClientRect().top + window.scrollY
    const recorrido = seccion.offsetHeight - window.innerHeight
    irAPosicion(inicio + Math.min(1, desde + .04) * recorrido)
  }

  return (
    <ol className="esc-dia-linea" aria-label={etiqueta}>
      {momentos.map((momento, indice) => {
        const desde = Number(tramos[indice]?.split(' ')[0] ?? 0)
        return (
          <li key={momento.cuando} data-beat={String(desde)}>
            <button type="button" aria-label={`Ir a ${momento.cuando}: ${momento.texto}`} onClick={(evento) => ir(evento.currentTarget, desde)} />
          </li>
        )
      })}
    </ol>
  )
}

function Nota({ datos, tramos, className = '' }: {
  datos: ReadonlyArray<{ titulo: string; texto: string; estado: string; tono: string }>
  tramos: readonly string[]
  className?: string
}) {
  return (
    <div className={`esc-nota ${className}`.trim()}>
      {datos.map((dato, indice) => (
        <div key={dato.titulo} className="esc-nota-cara esc-beat" data-beat={tramos[indice]}>
          <span className="esc-nota-numero">{String(indice + 1).padStart(2, '0')} — {String(datos.length).padStart(2, '0')}</span>
          <strong className="esc-nota-titulo">{dato.titulo}</strong>
          <p className="esc-nota-texto">{dato.texto}</p>
          <span className={`esc-nota-estado esc-nota-estado--${dato.tono}`}>{dato.estado}</span>
        </div>
      ))}
    </div>
  )
}

function Problema() {
  const tramos = ['0 0.3', '0.3 0.62', '0.62']
  return (
    <section id="problema" tabIndex={-1} className="esc esc-problema" data-scene data-theme="papel" style={variable('--len', 300)}>
      <div className="esc-escenario esc-dia-escenario" data-scene-exit>
        <div className="esc-dia-calor" aria-hidden="true" />
        <div className="esc-dia-fondo" aria-hidden="true">
          <div className="esc-dia-video esc-dia-video--manana"><VideoFondo video={videos.manana} /></div>
          <div className="esc-dia-video esc-dia-video--calor"><VideoFondo video={videos.calor} /></div>
          <div className="esc-dia-video esc-dia-video--lluvia"><VideoFondo video={videos.lluvia} /></div>
        </div>
        <div className="esc-dia-lluvia" aria-hidden="true">
          {Array.from({ length: 28 }, (_, indice) => (
            <span key={indice} style={variable('--g', indice)} />
          ))}
        </div>

        <div className="esc-dia-relato">
          <span className="esc-etiqueta">El problema · un día en el galpón</span>
          <div className="esc-dia-reloj" aria-hidden="true">
            {problema.momentos.map((momento, indice) => (
              <strong key={momento.cuando} className="esc-beat" data-beat={tramos[indice]}>{momento.cuando}</strong>
            ))}
          </div>
          <div className="esc-dia-mensajes">
            {problema.momentos.map((momento, indice) => (
              <p key={momento.cuando} className="esc-beat" data-beat={tramos[indice]}>{momento.texto}</p>
            ))}
          </div>
          <LineaMomentos momentos={problema.momentos} tramos={tramos} etiqueta="Un día en el galpón" />
        </div>

        <div className="esc-dia-escena" aria-hidden="true">
          <Nota datos={problema.datos} tramos={tramos} />
        </div>

        <p className="esc-dia-remate esc-beat" data-beat="0.78">
          El trabajo se hizo. <em>La información se perdió.</em>
        </p>
      </div>
    </section>
  )
}

const TRAMOS_SOLUCION = ['0 0.24', '0.24 0.44', '0.44 0.64', '0.64']

function Producto() {
  return (
    <section id="producto" className="esc esc-producto" data-scene data-theme="tinta" style={variable('--len', 300)}>
      <div className="esc-escenario esc-dia-escenario esc-sol-escenario" data-scene-exit>
        <div className="esc-sol-fondo" aria-hidden="true">
          <VideoFondo video={videos.solucion} />
        </div>
        <div className="esc-dia-relato">
          <span className="esc-etiqueta">La solución · el mismo día</span>
          <h2 className="sr-only">{producto.titulo}</h2>
          <div className="esc-dia-reloj" aria-hidden="true">
            {producto.momentos.map((momento, indice) => (
              <strong key={momento.cuando} className="esc-beat" data-beat={TRAMOS_SOLUCION[indice]}>{momento.cuando}</strong>
            ))}
          </div>
          <div className="esc-dia-mensajes">
            {producto.momentos.map((momento, indice) => (
              <p key={momento.cuando} className="esc-beat" data-beat={TRAMOS_SOLUCION[indice]}>{momento.texto}</p>
            ))}
          </div>
          <LineaMomentos momentos={producto.momentos} tramos={TRAMOS_SOLUCION} etiqueta={producto.titulo} />
          <Nota datos={producto.datos} tramos={TRAMOS_SOLUCION} className="esc-nota--relato" />
        </div>

        <div className="esc-sol-escena">
        </div>

        <p className="esc-dia-remate esc-sol-remate esc-beat" data-beat="0.8">
          {producto.remate[0]} <em>{producto.remate[1]}</em>
        </p>
      </div>
    </section>
  )
}

const TRAMOS_GANAS = ['0 0.25', '0.25 0.5', '0.5 0.75', '0.75']

function irAlTramo(elemento: HTMLElement, desde: number) {
  const seccion = elemento.closest<HTMLElement>('[data-scene]')
  if (!seccion) return
  const inicio = seccion.getBoundingClientRect().top + window.scrollY
  const recorrido = seccion.offsetHeight - window.innerHeight
  irAPosicion(inicio + Math.min(1, desde + .04) * recorrido)
}

function Beneficios() {
  return (
    <section id="beneficios" className="esc esc-ganas" data-scene data-theme="tinta" style={variable('--len', 380)}>
      <div className="esc-escenario esc-ganas-escenario" data-scene-exit>
        <div className="esc-ganas-relato">
          <span className="esc-etiqueta">{beneficios.etiqueta}</span>
          <h2>{beneficios.titulo[0]} <em>{beneficios.titulo[1]}</em></h2>
          <ol className="esc-ganas-lista">
            {beneficios.lista.map((beneficio, indice) => (
              <li key={beneficio.titulo} className="esc-ganas-item" data-beat={TRAMOS_GANAS[indice]}>
                <button type="button" onClick={(evento) => irAlTramo(evento.currentTarget, Number(TRAMOS_GANAS[indice]?.split(' ')[0] ?? 0))}>
                  <span className="esc-ganas-numero">{String(indice + 1).padStart(2, '0')}</span>
                  <span className="esc-ganas-titulo">{beneficio.titulo}</span>
                </button>
                <div className="esc-ganas-detalle"><p>{beneficio.texto}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="esc-ganas-escena" aria-hidden="true">
          <div className="esc-ganas-vista esc-ganas-vista--alerta" data-beat={TRAMOS_GANAS[0]}>
            <header className="esc-ganas-vista-cabecera"><h3>{beneficios.lista[0]?.titulo}</h3><p>{beneficios.lista[0]?.texto}</p></header>
            <div className="esc-ganas-vista-cuerpo">
              <div className="esc-lectura">
                <span className="esc-lectura-vivo">Galpón 2 · en vivo</span>
                <strong>34<small>°C</small></strong>
                <span className="esc-lectura-rango">Ideal: 26–30 °C</span>
              </div>
              <div className="esc-noti-pila">
                <div className="esc-noti esc-noti--alerta" style={variable('--i', 0)}>
                  <span className="esc-noti-icono"><IcAlert size={18} /></span>
                  <div><strong>Galpón 2 · 34 °C</strong><small>Más caliente de lo ideal para pollos de 15 días.</small></div>
                  <span className="esc-noti-hora">ahora</span>
                </div>
                <div className="esc-noti" style={variable('--i', 1)}>
                  <span className="esc-noti-icono esc-noti-icono--accion"><IcArrowRight size={18} /></span>
                  <div><strong>Abre las cortinas laterales</strong><small>Sugerencia para bajar la temperatura.</small></div>
                </div>
                <div className="esc-noti esc-noti--ok" style={variable('--i', 2)}>
                  <span className="esc-noti-icono esc-noti-icono--ok"><IcCheck size={18} /></span>
                  <div><strong>De vuelta en 29 °C</strong><small>El galpón volvió al rango ideal.</small></div>
                  <span className="esc-noti-hora">20 min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="esc-ganas-vista esc-ganas-vista--equipo" data-beat={TRAMOS_GANAS[1]}>
            <header className="esc-ganas-vista-cabecera"><h3>{beneficios.lista[1]?.titulo}</h3><p>{beneficios.lista[1]?.texto}</p></header>
            <div className="esc-ganas-vista-cuerpo">
              <span className="esc-ganas-vista-titulo">Hoy en el Galpón 2</span>
              <ul className="esc-actividad">
                {[
                  { inicial: 'M', nombre: 'Marta', accion: 'registró el pesaje', cuando: '6:10 a. m.' },
                  { inicial: 'J', nombre: 'Jorge', accion: 'anotó 40 kg de alimento', cuando: '7:02 a. m.' },
                  { inicial: 'L', nombre: 'Luis', accion: 'reportó 2 aves muertas', cuando: '9:45 a. m.' },
                  { inicial: 'M', nombre: 'Marta', accion: 'aplicó la vacuna de Newcastle', cuando: '11:20 a. m.' },
                ].map((item, indice) => (
                  <li key={`${item.nombre}-${item.cuando}`} style={variable('--i', indice)}>
                    <span className="esc-actividad-avatar">{item.inicial}</span>
                    <span><strong>{item.nombre}</strong> {item.accion}</span>
                    <small>{item.cuando}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="esc-ganas-vista esc-ganas-vista--curva" data-beat={TRAMOS_GANAS[2]}>
            <header className="esc-ganas-vista-cabecera"><h3>{beneficios.lista[2]?.titulo}</h3><p>{beneficios.lista[2]?.texto}</p></header>
            <div className="esc-ganas-vista-cuerpo">
              <AnimacionLottie
                nombre="crecimiento"
              velocidad={0.3}
                className="esc-ganas-lottie"
                quitarFondo
                capas={{ 'percentage Outlines': '#e3c565' }}
                colores={{ '#28194d': '#f7f6ef', '#f2b51c': '#e3c565', '#d3dbe1': '#c6d2bf', '#f9f9f9': '#005b48', '#ffffff': '#203b32' }}
                respaldo={(
                  <div className="esc-ganas-curva">
                    <svg viewBox="0 0 320 170">
                      <path className="esc-mini-esperada" d="M10 160 C 90 154, 170 128, 312 40" />
                      <path className="esc-mini-real" d="M10 160 C 84 144, 160 98, 250 52" pathLength={1} />
                      <circle cx="250" cy="52" r="8" className="esc-mini-punto" />
                    </svg>
                  </div>
                )}
              />
              <span className="esc-ganas-chip">Tu lote, comparado con la curva esperada</span>
            </div>
          </div>

          <div className="esc-ganas-vista esc-ganas-vista--alimento" data-beat={TRAMOS_GANAS[3]}>
            <header className="esc-ganas-vista-cabecera"><h3>{beneficios.lista[3]?.titulo}</h3><p>{beneficios.lista[3]?.texto}</p></header>
            <div className="esc-ganas-vista-cuerpo">
              <div className="esc-conversion">
                <div className="esc-conversion-cifra">
                  <strong>1,6</strong>
                  <small>kg de alimento por<br />kg de pollo</small>
                </div>
                <AnimacionLottie
                  nombre="alimento"
                velocidad={0.3}
                  className="esc-ganas-lottie esc-ganas-lottie--alimento"
                  quitarFondo
                  colores={{ '#005b48': '#c6d2bf', '#e3c565': '#e3c565', '#c6d2bf': '#c6d2bf', '#f7f6ef': '#f7f6ef', '#203b32': '#203b32' }}
                  respaldo={(
                    <div className="esc-conversion-barras">
                      {[0.92, 0.78, 0.66, 0.58].map((alto, indice) => (
                        <span key={alto} style={{ ...variable('--h', alto), ...variable('--i', indice) }} />
                      ))}
                    </div>
                  )}
                />
              </div>
              <span className="esc-ganas-vista-nota">Semana a semana, cada kilo de alimento rinde más.</span>
            </div>
          </div>
        </div>

        <small className="esc-ganas-nota">Datos de ejemplo. Así se ve Avisens con la información de tu granja.</small>
      </div>
    </section>
  )
}

function Mision() {
  return (
    <section id="mision" className="esc esc-mision" data-scene data-theme="tinta" style={variable('--len', 170)}>
      <div className="esc-escenario esc-mision-escenario">
        <span className="esc-etiqueta">{mision.etiqueta}</span>
        <p className="esc-mision-frase">
          {mision.frase.map((linea, indice) => (
            <span key={linea} style={variable('--i', indice)}>{linea}</span>
          ))}
        </p>
        <small className="esc-mision-firma">{mision.firma}</small>
      </div>
    </section>
  )
}

function Escenas() {
  const raiz = useRef<HTMLDivElement>(null)
  useEscenas(raiz)
  useScrollSuave()
  useEntradas(raiz)
  return (
    <div ref={raiz} className="esc-raiz" data-theme="noche">
      <Esquinas />
      <main>
        <Inicio />
        <Problema />
        <Producto />
        <Beneficios />
        <Mision />
      </main>
      <Footer />
    </div>
  )
}

export default Escenas
