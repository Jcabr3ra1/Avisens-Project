import { PUNTAJE_MAXIMO } from '../model/prospectoVista'

type Props = {
  puntaje: number
  color: string
}

const RADIO = 11
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

function ScoreDonut({ puntaje, color }: Props) {
  const avance = Math.min(puntaje / PUNTAJE_MAXIMO, 1)
  const desfase = CIRCUNFERENCIA * (1 - avance)

  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      className="crm-kcard-donut"
      aria-label={`Puntaje ${puntaje} de ${PUNTAJE_MAXIMO}`}
    >
      <circle
        cx="15"
        cy="15"
        r={RADIO}
        fill="none"
        stroke="rgba(10, 26, 20, 0.1)"
        strokeWidth="2.5"
      />
      <circle
        cx="15"
        cy="15"
        r={RADIO}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={CIRCUNFERENCIA.toFixed(2)}
        strokeDashoffset={desfase.toFixed(2)}
        strokeLinecap="round"
        transform="rotate(-90 15 15)"
      />
      <text x="15" y="19.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={color}>
        {puntaje}
      </text>
    </svg>
  )
}

export default ScoreDonut
