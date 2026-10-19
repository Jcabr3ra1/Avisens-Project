import './AnimacionAvisens.css'
import AnimacionAvisens from './AnimacionAvisens'

function CargandoAnimado({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <p className={`cargando-animado${className ? ` ${className}` : ''}`} role="status">
      <AnimacionAvisens nombre="cargando" tamano={34} velocidad={1} quitarFondo respaldo={<span className="cargando-animado-punto" aria-hidden="true" />} />
      <span>{texto}</span>
    </p>
  )
}

export default CargandoAnimado
