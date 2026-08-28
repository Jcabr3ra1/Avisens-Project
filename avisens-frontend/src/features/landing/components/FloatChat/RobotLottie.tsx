import { useEffect, useRef } from 'react'
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light'
import animacionRobot from '../../assets/robot-avia.json'

function prefiereMenosMovimiento() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Props = {
  size: number
  animando?: boolean
  className?: string
}

function RobotLottie({ size, animando = true, className }: Props) {
  const contenedor = useRef<HTMLSpanElement>(null)
  const animacion = useRef<AnimationItem | null>(null)
  const cargada = useRef(false)
  const animandoRef = useRef(animando)

  animandoRef.current = animando

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    const instancia = lottie.loadAnimation({
      container: nodo,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      animationData: animacionRobot,
    })

    const alCargar = () => {
      cargada.current = true
      if (animandoRef.current && !prefiereMenosMovimiento()) instancia.play()
      else instancia.goToAndStop(0, true)
    }

    instancia.addEventListener('DOMLoaded', alCargar)
    animacion.current = instancia

    return () => {
      cargada.current = false
      animacion.current = null
      instancia.destroy()
    }
  }, [])

  useEffect(() => {
    const instancia = animacion.current
    if (!instancia || !cargada.current) return

    if (animando && !prefiereMenosMovimiento()) instancia.play()
    else instancia.goToAndStop(0, true)
  }, [animando])

  return (
    <span
      ref={contenedor}
      className={className}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden="true"
    />
  )
}

export default RobotLottie
