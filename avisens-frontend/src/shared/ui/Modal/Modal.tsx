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
  variante?: 'centrado' | 'lateral'
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

function ContenidoModal({ titulo, subtitulo, onCerrar, children, acciones, ancho = 'normal', variante = 'centrado', bloqueado = false, focoInicial, descripcionId, icono }: Props) {
  const tarjeta = useRef<HTMLDivElement>(null)
  const focoPrevio = useRef<HTMLElement | null>(obtenerFocoDeRetorno())
  const tituloId = useId()
  const reducir = useReducedMotion()
  const estilos = getComputedStyle(document.documentElement)
  const entrada = parseFloat(estilos.getPropertyValue('--motion-dialog-enter')) / 1000 || 0.22
  const salida = parseFloat(estilos.getPropertyValue('--motion-dialog-exit')) / 1000 || 0.16
  const curva = estilos.getPropertyValue('--ease-standard').match(/[\d.]+/g)?.map(Number) as [number, number, number, number] | undefined
  const ease = curva?.length === 4 ? curva : [0.2, 0, 0, 1] as const
  const cerrar = () => { if (!bloqueado) onCerrar() }
  const esLateral = variante === 'lateral'

  useEffect(() => aislarFondo(tarjeta.current), [])
  useEffect(() => { if (bloqueado) tarjeta.current?.focus() }, [bloqueado])
  useFocoAtrapado(tarjeta, true, cerrar, focoPrevio.current, focoInicial)

  const inicialTarjeta = reducir
    ? { opacity: 0 }
    : esLateral
      ? { opacity: 0, transform: 'translateX(36px)' }
      : { opacity: 0, transform: 'translateY(10px) scale(0.97)' }
  const visibleTarjeta = reducir
    ? { opacity: 1 }
    : esLateral
      ? { opacity: 1, transform: 'translateX(0px)' }
      : { opacity: 1, transform: 'translateY(0px) scale(1)' }
  const salidaTarjeta = reducir
    ? { opacity: 0, transition: { duration: salida, ease } }
    : esLateral
      ? { opacity: 0, transform: 'translateX(28px)', transition: { duration: salida, ease } }
      : { opacity: 0, transform: 'translateY(8px) scale(0.97)', transition: { duration: salida, ease } }

  return (
    <motion.div
      className={`modal-velo${esLateral ? ' modal-velo--lateral' : ''}`}
      role="presentation"
      onClick={(evento) => { if (evento.target === evento.currentTarget) cerrar() }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: salida, ease } }}
      transition={{ duration: entrada, ease }}
    >
      <motion.div
        ref={tarjeta}
        className={`modal-tarjeta${esLateral ? ' modal-tarjeta--lateral' : ''}${ancho === 'ancho' ? ' modal-tarjeta--ancha' : ancho === 'compacto' ? ' modal-tarjeta--compacta' : ''}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        aria-busy={bloqueado || undefined}
        initial={inicialTarjeta}
        animate={visibleTarjeta}
        exit={salidaTarjeta}
        transition={{ duration: entrada, ease }}
      >
        <header className="modal-cabecera">
          {icono && <span className={esLateral ? 'modal-icono-caja' : undefined} aria-hidden="true">{icono}</span>}
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
