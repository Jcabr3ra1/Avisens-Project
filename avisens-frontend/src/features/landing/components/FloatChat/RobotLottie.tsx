import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web/build/player/lottie_light'
import aviaIdle from '../../assets/avia/avisens-idle.json'
import aviaHop from '../../assets/avia/avisens-hop.json'
import aviaFly from '../../assets/avia/avisens-fly.json'
import aviaWave from '../../assets/avia/avisens-wave.json'
import aviaProcessing from '../../assets/avia/avisens-processing.json'

type EstadoAvia = 'idle' | 'hop' | 'fly' | 'wave' | 'processing'

// La animación de vuelo no lleva tablet, pero sí debe conservar la identidad
// de AVIA. Reutilizamos la capa vectorial de sus gafas del estado de trabajo.
const capaGafas = aviaProcessing.layers.find((capa) => capa.ind === 13)
const aviaFlyConGafas = capaGafas
  ? { ...aviaFly, layers: [capaGafas, ...aviaFly.layers] }
  : aviaFly

function prefiereMenosMovimiento() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Props = {
  size: number
  animando?: boolean
  volando?: boolean
  saludar?: boolean
  className?: string
}

function RobotLottie({
  size,
  animando = false,
  volando = false,
  saludar = false,
  className,
}: Props) {
  const contenedor = useRef<HTMLSpanElement>(null)
  const [estado, setEstado] = useState<EstadoAvia>(
    volando ? 'fly' : animando ? 'processing' : 'idle',
  )

  useEffect(() => {
    // El vuelo tiene prioridad: AVIA deja la tablet antes de despegar y al
    // aterrizar vuelve automáticamente a la animación de procesamiento.
    if (volando) setEstado('fly')
    else if (animando) setEstado('processing')
    else if (saludar) setEstado('wave')
    else setEstado('idle')
  }, [animando, saludar, volando])

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    const animations = {
      idle: aviaIdle,
      hop: aviaHop,
      fly: aviaFlyConGafas,
      wave: aviaWave,
      processing: aviaProcessing,
    }

    const instancia = lottie.loadAnimation({
      container: nodo,
      renderer: 'svg',
      loop: estado === 'idle' || estado === 'fly' || estado === 'processing',
      autoplay: !prefiereMenosMovimiento(),
      animationData: animations[estado],
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    })

    const volverAlReposo = () => {
      if (estado === 'hop' || estado === 'wave') {
        setEstado('idle')
      }
    }

    instancia.addEventListener('complete', volverAlReposo)

    if (prefiereMenosMovimiento()) {
      instancia.goToAndStop(0, true)
    }

    return () => {
      instancia.removeEventListener('complete', volverAlReposo)
      instancia.destroy()
    }
  }, [estado])

  function saltar() {
    if (
      estado === 'idle' &&
      !animando &&
      !volando &&
      !prefiereMenosMovimiento()
    ) {
      setEstado('hop')
    }
  }

  return (
    <span
      ref={contenedor}
      className={className}
      onPointerEnter={saltar}
      style={{
        width: size,
        height: size,
        display: 'block',
      }}
      aria-hidden="true"
    />
  )
}

export default RobotLottie
