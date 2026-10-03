import celebra from '../../assets/avia/progress-6-celebra.png'
import tabletDerecha from '../../assets/avia/chat-tablet-right.png'
import tabletPaso from '../../assets/avia/chat-tablet-step.png'
import tabletAlegria from '../../assets/avia/chat-tablet-joy.png'

type Props = {
  progreso: number
  totalPasos: number | null
  finalizado: boolean
}

function etapaActual(progreso: number, totalPasos: number | null, finalizado: boolean) {
  if (finalizado) return 6
  if (!totalPasos || totalPasos < 1) return 1

  // Reparte cualquier cuestionario en las cinco etapas de acompañamiento.
  return Math.min(5, Math.max(1, Math.ceil((Math.max(1, progreso) / totalPasos) * 5)))
}

export default function AviaProgress({ progreso, totalPasos, finalizado }: Props) {
  const etapa = etapaActual(progreso, totalPasos, finalizado)

  if (etapa < 6) {
    // Cada tres respuestas AVIA pasa a la siguiente pose de acompañamiento.
    const pose = Math.floor(Math.max(0, progreso - 1) / 3) % 3
    const src = [tabletDerecha, tabletPaso, tabletAlegria][pose]
    const modificador = pose === 1 ? ' float-chat-avatar-pose--paso' : pose === 2 ? ' float-chat-avatar-pose--alegria' : ''

    return (
      <span className={`float-chat-avatar-pose${modificador}`} key={pose}>
        <img src={src} alt="" aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      key={etapa}
      className="float-chat-avatar-image"
      src={celebra}
      alt=""
      aria-hidden="true"
    />
  )
}
