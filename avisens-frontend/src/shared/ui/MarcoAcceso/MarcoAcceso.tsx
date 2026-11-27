import type { PointerEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import fotoGalpon from '@shared/assets/acceso-galpon.webp'
import logoAvisens from '@shared/assets/logo-avisens.png'
import './MarcoAcceso.css'

function MarcoAcceso({ children }: { children: ReactNode }) {
  function moverFoto(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if ((event.target as Element).closest('.login-panel')) return
    const marco = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--foto-x', `${((event.clientX - marco.left) / marco.width - 0.5) * 8}px`)
    event.currentTarget.style.setProperty('--foto-y', `${((event.clientY - marco.top) / marco.height - 0.5) * 8}px`)
  }

  function reposarFoto(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.removeProperty('--foto-x')
    event.currentTarget.style.removeProperty('--foto-y')
  }

  return (
    <div className="login-page" onPointerMove={moverFoto} onPointerLeave={reposarFoto}>
      <div className="login-scene">
        <img className="login-visual-img" src={fotoGalpon} alt="Galpón avícola comercial con pollos de engorde, comederos y bebederos" fetchPriority="high" />
      </div>

      <main className="login-panel">
        <Link to="/" className="login-brand" aria-label="Ir al inicio de AVISENS">
          <img src={logoAvisens} alt="" width={40} height={40} />
          <span>AVISENS</span>
        </Link>
        {children}
      </main>
    </div>
  )
}

export default MarcoAcceso
