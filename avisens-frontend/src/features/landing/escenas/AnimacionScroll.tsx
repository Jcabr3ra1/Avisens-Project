import { useEffect, useRef, useState, type ReactNode } from 'react'
import { adaptarColores } from '@shared/ui/Animacion/colores'
import { cuadroParaProgreso, type Tramo } from './tramos'

const animaciones = import.meta.glob<{ default: object }>('../assets/lottie/*.json')

type Instancia = { goToAndStop: (valor: number, esCuadro?: boolean) => void; destroy: () => void }

function AnimacionScroll({ nombre, tramos, className, respaldo = null, colores = {} }: {
  nombre: string
  tramos: Tramo[]
  className?: string
  respaldo?: ReactNode
  colores?: Record<string, string>
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const tramosRef = useRef(tramos)
  const coloresRef = useRef(colores)
  const [fallo, setFallo] = useState(false)
  const cargar = animaciones[`../assets/lottie/${nombre}.json`]

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo || !cargar) return
    const escena = nodo.closest<HTMLElement>('[data-scene]')
    let instancia: Instancia | null = null
    let vigente = true
    let programado = false
    let ultimo = -1

    const actualizar = () => {
      programado = false
      if (!instancia || !escena) return
      const caja = escena.getBoundingClientRect()
      const recorrido = caja.height - window.innerHeight
      const progreso = recorrido > 0 ? Math.min(1, Math.max(0, -caja.top / recorrido)) : 0
      const cuadro = cuadroParaProgreso(progreso, tramosRef.current)
      if (cuadro !== ultimo) {
        ultimo = cuadro
        instancia.goToAndStop(cuadro, true)
      }
    }
    const programar = () => {
      if (programado) return
      programado = true
      requestAnimationFrame(actualizar)
    }

    Promise.all([import('lottie-web/build/player/lottie_light'), cargar()])
      .then(([{ default: lottie }, modulo]) => {
        if (!vigente) return
        instancia = lottie.loadAnimation({
          container: nodo,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: adaptarColores(modulo.default, { colores: coloresRef.current }),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        }) as unknown as Instancia
        actualizar()
      })
      .catch(() => { if (vigente) setFallo(true) })

    window.addEventListener('scroll', programar, { passive: true })
    window.addEventListener('resize', programar)
    return () => {
      vigente = false
      window.removeEventListener('scroll', programar)
      window.removeEventListener('resize', programar)
      instancia?.destroy()
    }
  }, [cargar])

  if (!cargar || fallo) return <>{respaldo}</>
  return <div ref={contenedor} className={className} aria-hidden="true" />
}

export default AnimacionScroll
