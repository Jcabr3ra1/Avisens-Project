import { useEffect, useRef, useSyncExternalStore } from 'react'
import lottie from 'lottie-web/build/player/lottie_light'
import aviaIdle from '../../assets/avia/avisens-idle.json'
import aviaWave from '../../assets/avia/avisens-wave.json'
import aviaProcessing from '../../assets/avia/avisens-processing.json'

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)'

function suscribirMovimiento(notificar: () => void) {
  const consulta = window.matchMedia(CONSULTA_MOVIMIENTO)
  consulta.addEventListener('change', notificar)
  return () => consulta.removeEventListener('change', notificar)
}

function prefiereMenosMovimiento() {
  return window.matchMedia(CONSULTA_MOVIMIENTO).matches
}

type Props = {
  size: number
  animando?: boolean
  saludar?: boolean
  onSaludoTerminado?: () => void
  className?: string
}

function RobotLottie({
  size,
  animando = false,
  saludar = false,
  onSaludoTerminado,
  className,
}: Props) {
  const contenedor = useRef<HTMLSpanElement>(null)
  const menosMovimiento = useSyncExternalStore(
    suscribirMovimiento,
    prefiereMenosMovimiento,
    () => false,
  )
  const estado = animando ? 'processing' : saludar && !menosMovimiento ? 'wave' : 'idle'

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    const animations = { idle: aviaIdle, wave: aviaWave, processing: aviaProcessing }

    const instancia = lottie.loadAnimation({
      container: nodo,
      renderer: 'svg',
      loop: estado !== 'wave',
      autoplay: false,
      animationData: animations[estado],
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    })

    const alCargar = () => {
      if (menosMovimiento) instancia.goToAndStop(0, true)
      else instancia.play()
    }
    const alCompletar = () => {
      if (estado === 'wave') onSaludoTerminado?.()
    }

    instancia.addEventListener('DOMLoaded', alCargar)
    instancia.addEventListener('complete', alCompletar)
    // La preferencia también puede cambiar mientras el saludo está activo.
    if (saludar && menosMovimiento) onSaludoTerminado?.()

    return () => {
      instancia.removeEventListener('DOMLoaded', alCargar)
      instancia.removeEventListener('complete', alCompletar)
      instancia.destroy()
    }
  }, [estado, menosMovimiento, onSaludoTerminado, saludar])

  return (
    <span
      ref={contenedor}
      className={className}
      data-avia-estado={estado}
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
