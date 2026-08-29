import { Link } from 'react-router-dom'
import logoAvisens from '@shared/assets/logo-avisens.png'
import FormularioProspecto from './components/FormularioProspecto'
import './CaptacionPage.css'

function CaptacionPage() {
  return (
    <main className="captacion-page">
      <header className="captacion-header">
        <Link to="/" className="captacion-marca" aria-label="Volver al inicio de AVISENS">
          <img src={logoAvisens} alt="" />
          <span>AVISENS</span>
        </Link>
        <Link to="/login" className="captacion-entrar">Entrar</Link>
      </header>
      <FormularioProspecto />
    </main>
  )
}

export default CaptacionPage
