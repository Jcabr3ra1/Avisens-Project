import { Link } from 'react-router-dom'
import logoAvisens from '@shared/assets/logo-avisens.png'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="av-footer">
      <a href="#historia" className="av-footer-brand" aria-label="Volver al inicio de Avisens"><img src={logoAvisens} alt="" width={42} height={42} /></a>
      <p>Gestión avícola con las personas en el centro.<br /><span>Un proyecto colombiano, en construcción.</span></p>
      <nav aria-label="Enlaces de contacto">
        <a href="https://wa.me/573022358210?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20AVISENS" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <Link to="/contacto">Contacto</Link>
        <Link to="/login">Ingresar</Link>
      </nav>
      <small>© {new Date().getFullYear()} Avisens · Colombia</small>
    </footer>
  )
}
