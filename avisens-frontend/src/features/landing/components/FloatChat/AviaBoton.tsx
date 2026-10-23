import { useEffect, useState } from 'react'
import animado from '../../assets/avia/avia-chat-animado.webp'
import poster from '../../assets/avia/avia-chat-poster.png'

const MENOS_MOVIMIENTO = '(prefers-reduced-motion: reduce)'
const ESPERA_ANIMACION_MS = 1500

type Props = {
  size: number
  className?: string
}

// La animación pesa 1,2 MB: se descarga cuando la página ya está lista y solo
// se muestra al terminar de bajar, para no dejar el botón en blanco. Mientras
// tanto, y para quien reduce el movimiento, se ve el PNG.
function AviaBoton({ size, className }: Props) {
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    if (window.matchMedia(MENOS_MOVIMIENTO).matches) return
    let cancelado = false
    const espera = window.setTimeout(() => {
      const imagen = new Image()
      imagen.onload = () => {
        if (!cancelado) setAnimar(true)
      }
      imagen.src = animado
    }, ESPERA_ANIMACION_MS)
    return () => {
      cancelado = true
      window.clearTimeout(espera)
    }
  }, [])

  return (
    <img
      className={className}
      src={animar ? animado : poster}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}

export default AviaBoton
