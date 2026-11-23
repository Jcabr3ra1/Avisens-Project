import { formatearFechaLarga, formatearNumero } from '../model/metricas'

type EntradaTooltip = {
  name?: string | number
  value?: number | string | null
  color?: string
  dataKey?: string | number
}

type Props = {
  active?: boolean
  payload?: readonly EntradaTooltip[]
  label?: string | number
}

function TooltipGrafica({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0 || typeof label !== 'string') return null

  return (
    <div className="cdc-tooltip-grafica" role="status">
      <strong>{formatearFechaLarga(label)}</strong>
      <ul>
        {payload.map((entrada) => (
          <li key={String(entrada.dataKey)}>
            <i style={{ background: entrada.color }} aria-hidden="true" />
            <span>{entrada.name}</span>
            <b>{formatearNumero(Number(entrada.value ?? 0))}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TooltipGrafica
