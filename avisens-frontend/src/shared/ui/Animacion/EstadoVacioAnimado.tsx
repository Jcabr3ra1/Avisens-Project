import './AnimacionAvisens.css'
import type { ReactNode } from 'react'
import AnimacionAvisens, { type NombreAnimacion } from './AnimacionAvisens'

function EstadoVacioAnimado({ animacion, titulo, texto, accion, tamano = 120, className }: {
  animacion: NombreAnimacion
  titulo: string
  texto?: ReactNode
  accion?: ReactNode
  tamano?: number
  className?: string
}) {
  return (
    <div className={`vacio-animado${className ? ` ${className}` : ''}`}>
      <AnimacionAvisens nombre={animacion} tamano={tamano} velocidad={0.7} />
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  )
}

export default EstadoVacioAnimado
