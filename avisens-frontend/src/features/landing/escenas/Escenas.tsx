import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import '@fontsource-variable/oswald'
import { useFocoAtrapado } from '@shared/ui/Modal/useFocoAtrapado'
import logoAvisens from '@shared/assets/logo-avisens.png'
import { IcArrowRight, IcClose } from '@shared/ui/icons/icons'
import Footer from '../components/Footer/Footer'
import { beneficios, fotos, inicio, mision, problema, producto, videos, vitrina } from '../model/historia'
import { pasoDesdeTecla } from './pasos'
import { irASeccion, useScrollSuave } from './useScrollSuave'
import './Escenas.css'

const variable = (nombre: string, valor: number | string) => ({ [nombre]: valor }) as CSSProperties

const CURVA_ENTRADA = [0.23, 1, 0.32, 1] as const

const ENTRADA_BLOQUE = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.45, ease: CURVA_ENTRADA },
} as const

const CAPITULOS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'problema', label: 'El problema' },
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
    window.setTimeout(() => irASeccion(id), 220)
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
      transition={{ duration: 0.45, ease: [0.77, 0, 0.175, 1] }}
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
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + indice * 0.04, ease: CURVA_ENTRADA }}
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

function VideoFondo({ video, velocidad = 0.65, pausado = false, id }: { video: (typeof videos)[keyof typeof videos]; velocidad?: number; pausado?: boolean; id?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    elemento.defaultPlaybackRate = velocidad
    elemento.playbackRate = velocidad
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const actualizar = () => {
      if (visible && !document.hidden && !reducir.matches && !pausado) void elemento.play().catch(() => undefined)
      else elemento.pause()
    }
    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada?.isIntersecting ?? false
      actualizar()
    })
    observador.observe(elemento)
    document.addEventListener('visibilitychange', actualizar)
    reducir.addEventListener('change', actualizar)
    actualizar()
    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', actualizar)
      reducir.removeEventListener('change', actualizar)
      elemento.pause()
    }
  }, [velocidad, pausado])

  return (
    <video key={video.h264} id={id} ref={ref} muted loop playsInline preload="metadata" poster={video.poster} aria-hidden="true" tabIndex={-1}>
      {video.hevc && <source src={video.hevc} type='video/mp4; codecs="hvc1"' />}
      <source src={video.h264} type="video/mp4" />
    </video>
  )
}

function abrirAvia(ruta?: 'cotizacion' | 'general') {
  window.dispatchEvent(new CustomEvent('avisens:abrir-chat', { detail: { ruta } }))
}

function Inicio() {
  return (
    <section id="inicio" className="esc-seccion esc-inicio" data-theme="noche">
      <div className="esc-inicio-medio" aria-hidden="true">
        <VideoFondo video={videos.inicio} />
      </div>
      <motion.div
        className="esc-inicio-contenido"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: CURVA_ENTRADA }}
      >
        <div className="esc-inicio-titulo">
          <h1>{inicio.titulo[0]} <em>{inicio.titulo[1]}</em></h1>
          <p className="esc-inicio-promesa">{inicio.bajada}</p>
          <div className="esc-acciones esc-acciones--inicio">
            <button type="button" className="esc-boton esc-boton--maiz" onClick={() => abrirAvia('cotizacion')}>Cotiza tu granja con AVIA <IcArrowRight size={18} /></button>
            <a className="esc-boton esc-boton--claro" href="#problema">Ver cómo funciona</a>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function LineaInteractiva({
  momentos,
  activo,
  onCambiar,
  etiqueta,
  prefijoId,
}: {
  momentos: ReadonlyArray<{ cuando: string; texto: string }>
  activo: number
  onCambiar: (indice: number) => void
  etiqueta: string
  prefijoId: string
}) {
  const alPulsarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    const siguiente = pasoDesdeTecla(evento.key, activo, momentos.length)
    if (siguiente === null) return
    evento.preventDefault()
    onCambiar(siguiente)
  }

  return (
    <div
      className="esc-dia-tramos"
      role="tablist"
      aria-label={etiqueta}
      onKeyDown={alPulsarTecla}
    >
      {momentos.map((momento, indice) => {
        const seleccionado = indice === activo
        return (
          <button
            key={momento.cuando}
            id={`${prefijoId}-tab-${indice}`}
            type="button"
            role="tab"
            aria-selected={seleccionado}
            aria-controls={`${prefijoId}-panel`}
            tabIndex={seleccionado ? 0 : -1}
            className={`esc-dia-tramo ${seleccionado ? 'is-on' : ''}`}
            onClick={() => onCambiar(indice)}
          >
            <span className="esc-dia-tramo-barra" aria-hidden="true" />
            <span className="esc-dia-tramo-hora">{momento.cuando}</span>
          </button>
        )
      })}
    </div>
  )
}

function NotaActiva({
  dato,
  indice,
  total,
  className = '',
}: {
  dato: { titulo: string; texto: string; estado: string; tono: string }
  indice: number
  total: number
  className?: string
}) {
  return (
    <div className={`esc-nota ${className}`.trim()}>
      <AnimatePresence mode="wait">
        <motion.div
          key={dato.titulo}
          className="esc-nota-cara"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: CURVA_ENTRADA }}
        >
          <span className="esc-nota-numero">{String(indice + 1).padStart(2, '0')} — {String(total).padStart(2, '0')}</span>
          <strong className="esc-nota-titulo">{dato.titulo}</strong>
          <p className="esc-nota-texto">{dato.texto}</p>
          <span className={`esc-nota-estado esc-nota-estado--${dato.tono}`}>{dato.estado}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Problema() {
  const [activo, setActivo] = useState(0)
  const momento = problema.momentos[activo]!
  const dato = problema.datos[activo]!

  return (
    <section id="problema" tabIndex={-1} className="esc-seccion esc-problema" data-theme="papel">
      <div className={`esc-dia-calor ${activo === 1 ? 'is-on' : ''}`} aria-hidden="true" />
      <div className="esc-dia-fondo" aria-hidden="true">
        <div className={`esc-dia-video esc-dia-video--manana ${activo === 0 ? 'is-on' : ''}`}>
          <VideoFondo video={videos.manana} pausado={activo !== 0} />
        </div>
        <div className={`esc-dia-video esc-dia-video--calor ${activo === 1 ? 'is-on' : ''}`}>
          <VideoFondo video={videos.calor} pausado={activo !== 1} />
        </div>
        <div className={`esc-dia-video esc-dia-video--lluvia ${activo === 2 ? 'is-on' : ''}`}>
          <VideoFondo video={videos.lluvia} pausado={activo !== 2} />
        </div>
      </div>
      <div className={`esc-dia-lluvia ${activo === 2 ? 'is-on' : ''}`} aria-hidden="true">
        {Array.from({ length: 24 }, (_, indice) => (
          <span key={indice} style={variable('--g', indice)} />
        ))}
      </div>

      <motion.div className="esc-dia-escenario" {...ENTRADA_BLOQUE}>
        <div className="esc-dia-relato">
          <span className="esc-etiqueta">El problema · un día en el galpón</span>
          <div id="problema-panel" role="tabpanel" aria-labelledby={`problema-tab-${activo}`} className="esc-dia-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={momento.cuando}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: CURVA_ENTRADA }}
              >
                <strong className="esc-dia-hora">{momento.cuando}</strong>
                <p className="esc-dia-mensaje">{momento.texto}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <LineaInteractiva
            momentos={problema.momentos}
            activo={activo}
            onCambiar={setActivo}
            etiqueta="Momentos de un día en el galpón"
            prefijoId="problema"
          />
        </div>

        <div className="esc-dia-escena">
          <NotaActiva dato={dato} indice={activo} total={problema.datos.length} />
        </div>

        <p className="esc-dia-remate">
          El trabajo se hizo. <em>La información se perdió.</em>
        </p>
      </motion.div>
    </section>
  )
}

function Producto() {
  const [activo, setActivo] = useState(0)
  const momento = producto.momentos[activo]!
  const dato = producto.datos[activo]!

  return (
    <section id="producto" className="esc-seccion esc-producto" data-theme="tinta">
      <div className="esc-sol-fondo" aria-hidden="true">
        <VideoFondo video={videos.solucion} />
      </div>

      <motion.div className="esc-dia-escenario esc-sol-escenario" {...ENTRADA_BLOQUE}>
        <div className="esc-dia-relato">
          <span className="esc-etiqueta">La solución · el mismo día</span>
          <h2 className="sr-only">{producto.titulo}</h2>
          <div id="producto-panel" role="tabpanel" aria-labelledby={`producto-tab-${activo}`} className="esc-dia-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={momento.cuando}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: CURVA_ENTRADA }}
              >
                <strong className="esc-dia-hora">{momento.cuando}</strong>
                <p className="esc-dia-mensaje">{momento.texto}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <LineaInteractiva
            momentos={producto.momentos}
            activo={activo}
            onCambiar={setActivo}
            etiqueta={producto.titulo}
            prefijoId="producto"
          />
          <NotaActiva dato={dato} indice={activo} total={producto.datos.length} className="esc-nota--relato" />
        </div>

        <div className="esc-sol-escena" aria-hidden="true" />

        <p className="esc-dia-remate esc-sol-remate">
          {producto.remate[0]} <em>{producto.remate[1]}</em>
        </p>
      </motion.div>
    </section>
  )
}

const TARJETAS_BENEFICIOS = [
  {
    numero: '01',
    etiqueta: 'Monitoreo en vivo',
    tamano: 'ancha',
    tipo: 'video' as const,
    video: videos.beneficioLote,
    alt: 'Lote de pollos monitoreado en el galpón',
  },
  {
    numero: '02',
    etiqueta: 'En campo · celular',
    tamano: 'angosta',
    tipo: 'video' as const,
    video: videos.beneficioCelular,
    alt: 'Operario registrando información del galpón desde su celular',
  },
  {
    numero: '03',
    etiqueta: 'Desde el día 1',
    tamano: 'angosta',
    tipo: 'foto' as const,
    imagen: vitrina.pollitoDia1,
    alt: 'Pollito en primera semana dentro del galpón',
  },
  {
    numero: '04',
    etiqueta: 'Consumo y conversión',
    tamano: 'ancha',
    tipo: 'foto' as const,
    imagen: vitrina.pollosComederos,
    alt: 'Aves comiendo en los comederos del galpón',
  },
] as const

function Beneficios() {
  return (
    <section id="beneficios" className="esc-seccion esc-ganas" data-theme="tinta">
      <motion.div className="esc-ganas-contenedor" {...ENTRADA_BLOQUE}>
        <header className="esc-ganas-cabecera">
          <div>
            <span className="esc-etiqueta">{beneficios.etiqueta}</span>
            <h2>{beneficios.titulo[0]} <em>{beneficios.titulo[1]}</em></h2>
          </div>
          <p className="esc-ganas-intro">
            Así se vive Avisens dentro del galpón: registros rápidos, sensores al día y decisiones con datos reales.
          </p>
        </header>

        <div className="esc-bento">
          {TARJETAS_BENEFICIOS.map((tarjeta, indice) => {
            const beneficio = beneficios.lista[indice]!
            return (
              <motion.article
                key={beneficio.titulo}
                className={`esc-bento-card esc-bento-card--${tarjeta.tamano}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.42, delay: indice * 0.06, ease: CURVA_ENTRADA }}
              >
                <div className="esc-bento-medio">
                  {tarjeta.tipo === 'video' ? (
                    <VideoFondo video={tarjeta.video} velocidad={0.85} />
                  ) : (
                    <img src={tarjeta.imagen} alt={tarjeta.alt} loading="lazy" />
                  )}
                </div>
                <div className="esc-bento-cuerpo">
                  <div className="esc-bento-top">
                    <span className="esc-bento-num">{tarjeta.numero}</span>
                    <span className="esc-bento-chip">{tarjeta.etiqueta}</span>
                  </div>
                  <div className="esc-bento-texto">
                    <h3>{beneficio.titulo}</h3>
                    <p>{beneficio.texto}</p>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}

function Mision() {
  return (
    <section id="mision" className="esc-seccion esc-mision" data-theme="tinta">
      <motion.div className="esc-mision-escenario" {...ENTRADA_BLOQUE}>
        <span className="esc-etiqueta">{mision.etiqueta}</span>
        <p className="esc-mision-frase">
          {mision.frase.map((linea, indice) => (
            <span key={linea} className={indice === mision.frase.length - 1 ? 'esc-mision-remate' : undefined}>{linea}</span>
          ))}
        </p>
        <small className="esc-mision-firma">{mision.firma}</small>
      </motion.div>
    </section>
  )
}

function Escenas() {
  const raiz = useRef<HTMLDivElement>(null)
  useScrollSuave()

  useEffect(() => {
    const contenedor = raiz.current
    if (!contenedor) return
    const secciones = [...contenedor.querySelectorAll<HTMLElement>('.esc-seccion[data-theme]')]
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          const tema = (entrada.target as HTMLElement).dataset.theme
          if (tema && contenedor.dataset.theme !== tema) {
            contenedor.dataset.theme = tema
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    secciones.forEach((seccion) => observador.observe(seccion))
    return () => observador.disconnect()
  }, [])

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
