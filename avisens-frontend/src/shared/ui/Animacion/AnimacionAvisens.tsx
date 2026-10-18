import { useEffect, useRef, useState, type ReactNode } from 'react'
import { A_PALETA, adaptarColores, type OpcionesColor } from './colores'
import './AnimacionAvisens.css'

const archivos = import.meta.glob<{ default: object }>('../../assets/lottie/*.json')

export type NombreAnimacion = 'bandeja-vacia' | 'caja-vacia' | 'sin-resultados' | 'exito' | 'cargando' | 'campana' | 'logo-avisens'

export type ModoAnimacion = 'bucle' | 'una-vez' | 'al-pasar'

type Props = OpcionesColor & {
  nombre: NombreAnimacion
  modo?: ModoAnimacion
  tamano?: number
  velocidad?: number
  className?: string
  respaldo?: ReactNode
  reproducir?: number
}

type Instancia = {
  play: () => void
  pause: () => void
  stop: () => void
  goToAndPlay: (valor: number, esFrame?: boolean) => void
  goToAndStop: (valor: number, esFrame?: boolean) => void
  setSpeed: (velocidad: number) => void
  destroy: () => void
  totalFrames: number
}

function AnimacionAvisens({
  nombre,
  modo = 'bucle',
  tamano = 120,
  velocidad = 0.8,
  className,
  respaldo = null,
  reproducir = 0,
  colores = A_PALETA,
  quitarFondo = false,
  capas,
}: Props) {
  const contenedor = useRef<HTMLSpanElement>(null)
  const instancia = useRef<Instancia | null>(null)
  const opciones = useRef({ colores, quitarFondo, capas, velocidad, modo })
  const [fallo, setFallo] = useState(false)
  const cargar = archivos[`../../assets/lottie/${nombre}.json`]

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo || !cargar) return
    let vigente = true
    const { colores: paleta, quitarFondo: sinFondo, capas: porCapa, velocidad: ritmo, modo: forma } = opciones.current
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observador = new IntersectionObserver(([entrada]) => {
      const actual = instancia.current
      if (!actual || forma !== 'bucle') return
      if (entrada.isIntersecting) actual.play()
      else actual.pause()
    }, { threshold: 0.2 })

    Promise.all([import('lottie-web/build/player/lottie_light'), cargar()])
      .then(([{ default: lottie }, modulo]) => {
        if (!vigente) return
        const animacion = lottie.loadAnimation({
          container: nodo,
          renderer: 'svg',
          loop: forma === 'bucle',
          autoplay: false,
          animationData: adaptarColores(modulo.default, { colores: paleta, quitarFondo: sinFondo, capas: porCapa }),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        }) as unknown as Instancia
        animacion.setSpeed(ritmo)
        instancia.current = animacion
        if (reducir) animacion.goToAndStop(animacion.totalFrames - 1, true)
        else if (forma === 'bucle') observador.observe(nodo)
        else if (forma === 'una-vez') animacion.goToAndPlay(0, true)
        else animacion.goToAndStop(animacion.totalFrames - 1, true)
      })
      .catch(() => { if (vigente) setFallo(true) })

    return () => {
      vigente = false
      observador.disconnect()
      instancia.current?.destroy()
      instancia.current = null
    }
  }, [cargar])

  useEffect(() => {
    if (!reproducir || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    instancia.current?.goToAndPlay(0, true)
  }, [reproducir])

  function alPasar() {
    if (modo !== 'al-pasar' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    instancia.current?.goToAndPlay(0, true)
  }

  if (!cargar || fallo) return <>{respaldo}</>

  return (
    <span
      ref={contenedor}
      className={`animacion-avisens${className ? ` ${className}` : ''}`}
      style={{ width: tamano, height: tamano }}
      onMouseEnter={alPasar}
      aria-hidden="true"
    />
  )
}

export default AnimacionAvisens
