import { useEffect, useRef, useState, type ReactNode } from 'react'
import lottie from 'lottie-web/build/player/lottie_svg'
import { adaptarColores } from '@shared/ui/Animacion/colores'

const animaciones = import.meta.glob<{ default: object }>('../assets/lottie/*.json')

function AnimacionLottie({ nombre, className, respaldo, colores = {}, quitarFondo = false, capas = {}, velocidad = 0.55 }: {
  nombre: string
  velocidad?: number
  className?: string
  respaldo: ReactNode
  colores?: Record<string, string>
  quitarFondo?: boolean
  capas?: Record<string, string>
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [fallo, setFallo] = useState(false)
  const cargar = animaciones[`../assets/lottie/${nombre}.json`]
  const coloresRef = useRef(colores)
  const capasRef = useRef(capas)

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo || !cargar) return
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let instancia: ReturnType<typeof lottie.loadAnimation> | null = null
    let vigente = true
    const observador = new IntersectionObserver(([entrada]) => {
      if (!instancia) return
      if (entrada.isIntersecting) instancia.play()
      else instancia.pause()
    }, { threshold: 0.25 })

    cargar()
      .then((modulo) => {
        if (!vigente) return
        instancia = lottie.loadAnimation({
          container: nodo,
          renderer: 'svg',
          loop: true,
          autoplay: false,
          animationData: adaptarColores(modulo.default, { colores: coloresRef.current, quitarFondo, capas: capasRef.current }),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        })
        instancia.setSpeed(velocidad)
        if (reducir) instancia.goToAndStop(instancia.totalFrames - 1, true)
        else observador.observe(nodo)
      })
      .catch(() => { if (vigente) setFallo(true) })

    return () => {
      vigente = false
      observador.disconnect()
      instancia?.destroy()
    }
  }, [cargar, quitarFondo, velocidad])

  if (!cargar || fallo) return <>{respaldo}</>
  return <div ref={contenedor} className={className} aria-hidden="true" />
}

export default AnimacionLottie
