import './Estados.css'

function Cargando({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <p className={`estado-cargando${className ? ` ${className}` : ''}`} role="status">
      <span className="estado-cargando-punto" aria-hidden="true" />
      <span>{texto}</span>
    </p>
  )
}

export default Cargando
