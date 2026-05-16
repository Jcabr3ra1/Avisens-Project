import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="navbar" data-scrolled={scrolled}>
      <a href="#" className="nav-logo">
        <img src="/views/avisens/img/logo.png" alt="AVISENS" />
        <span>AVISENS</span>
      </a>
      <ul className="nav-links">
        {[
          ['Funciones', '#features'],
          ['Precios', '#pricing'],
          ['Dispositivos', '#devices'],
          ['AVIA IA', '#chatbot'],
        ].map(([label, href]) => (
          <li key={label}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
      <div className="nav-actions">
        <Link to="/login" className="btn-ghost">Iniciar sesión</Link>
        <a href="#pricing" className="btn-primary">Probar gratis</a>
      </div>
    </nav>
  )
}

export default Navbar
