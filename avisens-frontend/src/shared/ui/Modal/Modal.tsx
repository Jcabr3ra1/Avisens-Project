import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IcClose } from '@shared/ui/icons/icons'
import { useFocoAtrapado } from './useFocoAtrapado'
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
  // El Modal siempre está montado mientras existe, así que "activo" es
  // siempre true — la lógica de encendido/apagado vive en quien lo renderiza.
  useFocoAtrapado(tarjeta, true, onCerrar)

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
