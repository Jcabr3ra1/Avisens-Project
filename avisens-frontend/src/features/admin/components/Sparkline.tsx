import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { useReducedMotion } from 'motion/react'

type Props = {
  valores: number[]
  color: string
  id: string
}

function Sparkline({ valores, color, id }: Props) {
  const sinMovimiento = useReducedMotion()
  const datos = valores.map((valor, indice) => ({ indice, valor }))

  return (
    <div className="cdc-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={datos} margin={{ top: 3, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="valor"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#spark-${id})`}
            dot={false}
            isAnimationActive={!sinMovimiento}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Sparkline
