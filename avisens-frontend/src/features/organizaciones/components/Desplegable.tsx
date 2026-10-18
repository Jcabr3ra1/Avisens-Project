import type { CSSProperties, ReactNode, Ref } from 'react'
import { IcChevronDown } from '@shared/ui/icons/icons'
import '@shared/ui/movimiento.css'

interface Props {
  titulo: string
  icono: ReactNode
  conteo?: number
  abierto?: boolean
  orden?: number
  ref?: Ref<HTMLDetailsElement>
  children: ReactNode
}

function Desplegable({ titulo, icono, conteo, abierto = false, orden = 0, ref, children }: Props) {
  return (
    <details
      ref={ref}
      className="org-detalle-desplegable adm-panel org-aparece"
      style={{ '--orden': orden } as CSSProperties}
      open={abierto}
    >
      <summary>
        <span className="org-sumario-icono" aria-hidden="true">{icono}</span>
        <h2>{titulo}</h2>
        {conteo !== undefined && (
          <span className="org-sumario-conteo"><span className="sr-only">Total: </span>{conteo}</span>
        )}
        <span className="org-sumario-chevron" aria-hidden="true"><IcChevronDown size={18} /></span>
      </summary>
      <div className="org-desplegable-cuerpo">{children}</div>
    </details>
  )
}

export default Desplegable
