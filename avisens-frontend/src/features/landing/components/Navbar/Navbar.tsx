import { Link } from 'react-router-dom'
import { IcArrowRight } from '@shared/ui/icons/icons'
import logoAvisens from '@shared/assets/logo-avisens.png'
import { landingChapters } from '../../model/landingContent'
import './Navbar.css'

export default function Navbar() {
  return (
    <header className="av-site-header">
      <a className="av-skip-link" href="#historia">Ir a la historia</a>
      <nav className="av-navigation" aria-label="Navegación principal">
        <a href="#historia" className="av-brand" aria-label="Avisens, inicio de la historia"><img src={logoAvisens} alt="" width={44} height={44} /></a>
        <div className="av-navigation-chapters">
          {landingChapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} data-chapter-link>{chapter.label}</a>)}
        </div>
        <div className="av-navigation-actions">
          <Link to="/login" className="av-login-link">Entrar</Link>
          <Link className="av-header-contact" to="/contacto">Conversemos <IcArrowRight size={16} /></Link>
        </div>
      </nav>
      <div className="av-reading-progress" aria-hidden="true"><span data-story-progress /></div>
    </header>
  )
}
