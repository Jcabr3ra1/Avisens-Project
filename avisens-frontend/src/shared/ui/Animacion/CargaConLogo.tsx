import AnimacionAvisens from './AnimacionAvisens'
import './AnimacionAvisens.css'

function CargaConLogo({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="carga-logo" role="status">
      <AnimacionAvisens nombre="logo-avisens" tamano={112} velocidad={1} colores={{}} respaldo={<span className="carga-logo-punto" aria-hidden="true" />} />
      <span>{texto}</span>
    </div>
  )
}

export default CargaConLogo
