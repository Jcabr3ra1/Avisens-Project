import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from '@shared/ui/icons/icons'
import './Modal.css'

type Props = {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  acciones?: ReactNode
  ancho?: 'normal' | 'ancho'
}

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Modal({ titulo, subtitulo, onCerrar, children, acciones, ancho = 'normal' }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // El foco entra al diálogo y no vuelve a salir mientras esté abierto: sin
    // esto el Tab se escapa al formulario de atrás, que el usuario no ve.
    const previo = document.activeElement as HTMLElement | null
    const primero = tarjeta.current?.querySelector<HTMLElement>(FOCUSABLES)
    primero?.focus()

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onCerrar()
        return
      }
      if (evento.key !== 'Tab' || !tarjeta.current) return

      const focusables = Array.from(
        tarjeta.current.querySelectorAll<HTMLElement>(FOCUSABLES),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return

      const inicio = focusables[0]
      const fin = focusables[focusables.length - 1]

      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault()
        fin.focus()
      } else if (!evento.shiftKey && document.activeElement === fin) {
        evento.preventDefault()
        inicio.focus()
      }
    }

    window.addEventListener('keydown', alTeclear)

    // Sin esto la página de atrás sigue scrolleando bajo el diálogo.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowPrevio
      previo?.focus()
    }
  }, [onCerrar])

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
