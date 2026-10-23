import logoAvisens from '@shared/assets/logo-avisens.png'
import './Estados.css'

function CargaConLogo({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="carga-logo" role="status">
      <img className="carga-logo-marca" src={logoAvisens} alt="" width={72} height={72} />
      <span>{texto}</span>
    </div>
  )
}

export default CargaConLogo
