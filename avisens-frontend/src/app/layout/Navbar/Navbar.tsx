import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 lg:px-16 h-[66px] border-b border-border backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 ${scrolled ? 'bg-bg3' : 'bg-bg2'}`}>

      <a href="#" className="flex items-center gap-2.5 no-underline min-w-[140px] shrink-0">
        <img src="/views/avisens/img/logo.png" alt="AVISENS" className="h-8" />
        <span className="font-['Space_Grotesk'] text-[1.15rem] font-bold text-text tracking-[-0.03em]">
          AVISENS
        </span>
      </a>

      <ul className="hidden md:flex items-center gap-7 list-none mx-auto px-4">
        {[
          ['Funciones',  '#features'],
          ['Precios',    '#pricing'],
          ['Dispositivos','#devices'],
          ['AVIA IA',    '#chatbot'],
        ].map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-text2 no-underline text-sm font-medium transition-colors duration-200 hover:text-success">
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="border border-border2 text-text2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:border-success hover:text-success2 no-underline"
        >
          Iniciar sesión
        </Link>
        <a
          href="#pricing"
          className="bg-gradient-to-br from-success to-success3 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] no-underline"
        >
          Probar gratis
        </a>
      </div>

    </nav>
  )
}

export default Navbar
