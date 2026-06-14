import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

const navItems = [
  ['Sensores', '#sensores'],
  ['Problemas', '#problems'],
  ['Funciones', '#features'],
  ['FAQ', '#faq'],
]

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <nav className="navbar" data-scrolled={scrolled} data-menu-open={menuOpen}>
      <a href="#" className="nav-logo">
        <span className="nav-logo-mark">
          <img src="/views/avisens/img/logo.png" alt="" />
        </span>
        <span className="nav-logo-copy">
          <strong>AVISENS</strong>
          <small>Avicultura inteligente</small>
        </span>
      </a>

      <ul className="nav-links">
        {navItems.map(([label, href]) => (
          <li key={label}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>

      <div className="nav-actions">
        <Link to="/login" className="nav-btn nav-btn-ghost">Entrar</Link>
        <a href="mailto:contacto@avisens.com" className="nav-btn nav-btn-primary">Contáctanos</a>
        <button
          className="nav-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="nav-mobile-panel" aria-hidden={!menuOpen}>
        {navItems.map(([label, href]) => (
          <a key={label} href={href} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
        <Link to="/login" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}>
          Iniciar sesión
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
