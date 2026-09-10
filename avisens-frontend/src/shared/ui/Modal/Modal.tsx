import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from '@shared/ui/icons/icons'
import { obtenerFocoDeRetorno, useFocoAtrapado } from './useFocoAtrapado'
import './Modal.css'

type Props = {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  acciones?: ReactNode
  ancho?: 'normal' | 'ancho'
}

function Modal({ titulo, subtitulo, onCerrar, children, acciones, ancho = 'normal' }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)
  const focoPrevio = useRef<HTMLElement | null>(obtenerFocoDeRetorno())

  useEffect(() => {
    const aplicacion = document.getElementById('root')
    if (!aplicacion) return

    const elementoRetorno = focoPrevio.current
    const inertPrevio = aplicacion.inert
    const ariaHiddenPrevio = aplicacion.getAttribute('aria-hidden')
    aplicacion.inert = true
    aplicacion.setAttribute('aria-hidden', 'true')

    return () => {
      aplicacion.inert = inertPrevio
      if (ariaHiddenPrevio === null) aplicacion.removeAttribute('aria-hidden')
      else aplicacion.setAttribute('aria-hidden', ariaHiddenPrevio)
      window.setTimeout(() => elementoRetorno?.focus(), 0)
    }
  }, [])

  // Se registra después del aislamiento del fondo para que, al desmontar,
  // primero se reactive la aplicación y luego el foco vuelva al disparador.
  useFocoAtrapado(tarjeta, true, onCerrar, focoPrevio.current)

  return createPortal(
    <div className="modal-velo" role="presentation" onClick={onCerrar}>
      <div
        ref={tarjeta}
        className={`modal-tarjeta${ancho === 'ancho' ? ' modal-tarjeta--ancha' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="modal-cabecera">
          <div className="modal-ident">
            <h2 className="modal-titulo">{titulo}</h2>
            {subtitulo && <p className="modal-sub">{subtitulo}</p>}
          </div>
          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <IcClose size={17} />
          </button>
        </header>

        <div className="modal-cuerpo">{children}</div>

        {acciones && <footer className="modal-pie">{acciones}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
