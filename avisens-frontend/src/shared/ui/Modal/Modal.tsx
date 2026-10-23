import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IcClose } from '@shared/ui/icons/icons'
import { obtenerFocoDeRetorno, useFocoAtrapado } from './useFocoAtrapado'
import './Modal.css'

type Props = {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  acciones?: ReactNode
  ancho?: 'compacto' | 'normal' | 'ancho'
  abierto?: boolean
  onSalida?: () => void
  bloqueado?: boolean
  focoInicial?: RefObject<HTMLElement | null>
  descripcionId?: string
  icono?: ReactNode
}

// Contar aislamientos evita reactivar el fondo al cerrar un diálogo anidado.
const aislamientos = new Map<HTMLElement, { cantidad: number; inert: boolean; aria: string | null }>()

function aislarFondo(dialogo: HTMLElement | null) {
  const root = document.getElementById('root')
  const fondos = new Set([
    ...(root ? [root] : []),
    ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
  ])
  fondos.forEach(elemento => {
    if (elemento === dialogo || elemento.contains(dialogo)) { fondos.delete(elemento); return }
    const anterior = aislamientos.get(elemento)
    if (anterior) anterior.cantidad++
    else aislamientos.set(elemento, { cantidad: 1, inert: elemento.inert, aria: elemento.getAttribute('aria-hidden') })
    elemento.inert = true
    elemento.setAttribute('aria-hidden', 'true')
  })
  return () => fondos.forEach(elemento => {
    const anterior = aislamientos.get(elemento)
    if (!anterior || --anterior.cantidad > 0) return
    elemento.inert = anterior.inert
    if (anterior.aria === null) elemento.removeAttribute('aria-hidden')
    else elemento.setAttribute('aria-hidden', anterior.aria)
    aislamientos.delete(elemento)
  })
}

function ContenidoModal({ titulo, subtitulo, onCerrar, children, acciones, ancho = 'normal', bloqueado = false, focoInicial, descripcionId, icono }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)
  const focoPrevio = useRef<HTMLElement | null>(obtenerFocoDeRetorno())
  const tituloId = useId()
  const reducir = useReducedMotion()
  const estilos = getComputedStyle(document.documentElement)
  const entrada = parseFloat(estilos.getPropertyValue('--motion-dialog-enter')) / 1000 || 0.2
  const salida = parseFloat(estilos.getPropertyValue('--motion-dialog-exit')) / 1000 || 0.16
  const curva = estilos.getPropertyValue('--ease-standard').match(/[\d.]+/g)?.map(Number) as [number, number, number, number] | undefined
  const ease = curva?.length === 4 ? curva : [0.2, 0, 0, 1] as const
  const cerrar = () => { if (!bloqueado) onCerrar() }

  useEffect(() => aislarFondo(tarjeta.current), [])
  useEffect(() => { if (bloqueado) tarjeta.current?.focus() }, [bloqueado])
  useFocoAtrapado(tarjeta, true, cerrar, focoPrevio.current, focoInicial)

  return (
    <motion.div
      className="modal-velo"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: salida, ease } }}
      transition={{ duration: entrada, ease }}
    >
      <motion.div
        ref={tarjeta}
        className={`modal-tarjeta${ancho === 'ancho' ? ' modal-tarjeta--ancha' : ancho === 'compacto' ? ' modal-tarjeta--compacta' : ''}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        aria-busy={bloqueado || undefined}
        initial={{ opacity: 0, transform: reducir ? 'none' : 'translateY(10px) scale(0.97)' }}
        animate={{ opacity: 1, transform: reducir ? 'none' : 'translateY(0px) scale(1)' }}
        exit={{ opacity: 0, transform: reducir ? 'none' : 'translateY(8px) scale(0.97)', transition: { duration: salida, ease } }}
        transition={{ duration: entrada, ease }}
      >
        <header className="modal-cabecera">
          {icono}
          <div className="modal-ident">
            <h2 id={tituloId} className="modal-titulo">{titulo}</h2>
            {subtitulo && <p className="modal-sub">{subtitulo}</p>}
          </div>
          <button type="button" className="modal-cerrar" onClick={cerrar} disabled={bloqueado} aria-label="Cerrar">
            <IcClose size={17} />
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
        {acciones && <footer className="modal-pie">{acciones}</footer>}
      </motion.div>
    </motion.div>
  )
}

function Modal({ abierto = true, onSalida, ...props }: Props) {
  return createPortal(
    <AnimatePresence onExitComplete={onSalida}>
      {abierto && <ContenidoModal key="modal" {...props} />}
    </AnimatePresence>,
    document.body,
  )
}

export default Modal
