import './Estados.css'
import type { ReactNode } from 'react'

function EstadoVacio({ titulo, texto, accion, className }: {
  titulo: string
  texto?: ReactNode
  accion?: ReactNode
  className?: string
}) {
  return (
    <div className={`estado-vacio${className ? ` ${className}` : ''}`}>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  )
}

export default EstadoVacio
