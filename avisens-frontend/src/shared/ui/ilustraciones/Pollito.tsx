import type { CSSProperties } from 'react'
import './Pollito.css'

const CONTORNO = { stroke: 'var(--contorno, #203b32)', strokeWidth: 1.3, strokeLinejoin: 'round' as const }

type Props = {
  x: number
  y: number
  escala: number
  mirada?: 1 | -1
  retraso?: number
}

function Pollito({ x, y, escala, mirada = 1, retraso = 0 }: Props) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(escala * mirada).toFixed(3)} ${escala.toFixed(3)})`}>
      <g className="pollito" style={{ '--retraso': `${retraso.toFixed(2)}s` } as CSSProperties}>
        <path d="M-4 -7V0M3 -7V0" stroke="var(--pata, #d98a2b)" strokeWidth="2" strokeLinecap="round" />
        <path d="M-10 -17q-6 -2 -8 -8q6 0 9 4z" fill="var(--plumaje-sombra, #c9a94a)" {...CONTORNO} />
        <ellipse cx="0" cy="-15" rx="11" ry="9" fill="var(--plumaje, #ecc85a)" {...CONTORNO} />
        <path d="M-6 -15q6 -7 12 0q-6 6 -12 0z" fill="var(--plumaje-sombra, #c9a94a)" {...CONTORNO} />
        <circle cx="8" cy="-25" r="6.5" fill="var(--plumaje, #ecc85a)" {...CONTORNO} />
        <path d="M13.5 -26.2L18.5 -24.2L13.5 -22.6z" fill="var(--pata, #d98a2b)" {...CONTORNO} />
        <circle cx="10.2" cy="-26.4" r="1.2" fill="var(--tinta, #203b32)" />
      </g>
    </g>
  )
}

export default Pollito
