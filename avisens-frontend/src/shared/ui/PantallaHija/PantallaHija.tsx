import { useEffect, type ReactNode } from 'react'
import { IcClose } from '@shared/ui/icons/icons'
import './PantallaHija.css'

type Props = {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
}

function PantallaHija({ titulo, subtitulo, onCerrar, children }: Props) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div className="hija-overlay" onClick={onCerrar}>
      <section
        className="hija-panel"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hija-head">
          <div className="hija-ident">
            <h2 className="hija-titulo">{titulo}</h2>
            {subtitulo && <span className="hija-sub">{subtitulo}</span>}
          </div>
          <button type="button" className="hija-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={18} />
          </button>
        </header>
        <div className="hija-body">{children}</div>
      </section>
    </div>
  )
}

export default PantallaHija
