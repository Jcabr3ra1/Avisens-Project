import type { ReactNode } from 'react'
import galponReal from '@features/dashboard/assets/escena/galpon-real.webp'
import { faseSegunHora, type FaseBanner } from './saludo'
import './BannerSaludo.css'

type Props = {
  fecha: string
  contexto?: string | null
  titulo: string
  subtitulo?: ReactNode
  fase?: FaseBanner
  acciones?: ReactNode
}

function BannerSaludo({ fecha, contexto, titulo, subtitulo, fase = faseSegunHora(), acciones }: Props) {
  return (
    <header className="bs-hero" data-fase={fase}>
      <img className="bs-hero-foto" src={galponReal} alt="" aria-hidden="true" />
      <div className="bs-hero-velo" aria-hidden="true" />

      <div className="bs-hero-cuerpo">
        <div className="bs-hero-texto">
          <p className="bs-hero-fecha">
            <time>{fecha}</time>
            {contexto && <span> · {contexto}</span>}
          </p>
          <h1 className="bs-hero-titulo">{titulo}</h1>
          {subtitulo && <p className="bs-hero-sub">{subtitulo}</p>}
        </div>

        {acciones && <div className="bs-hero-acciones">{acciones}</div>}
      </div>
    </header>
  )
}

export default BannerSaludo
