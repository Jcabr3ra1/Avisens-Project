import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import {
  formatearFechaCorta, formatearNumero, hayActividad, serieCrecimiento, sumarCampo, type MetricasAdmin,
} from '../model/metricas'
import PanelGrafica from './PanelGrafica'
import TooltipGrafica from './TooltipGrafica'

type Props = {
  metricas: MetricasAdmin | null
  cargando: boolean
  error: boolean
  onReintentar: () => void
}

const COLOR_USUARIOS = 'var(--avisens-deep)'
const COLOR_ORGANIZACIONES = 'var(--cdc-tono-salvia)'

function PanelCrecimiento({ metricas, cargando, error, onReintentar }: Props) {
  const sinMovimiento = useReducedMotion()
  const series = metricas?.series
  const datos = useMemo(() => serieCrecimiento(series ?? []), [series])
  const vacio = series !== undefined && !hayActividad(series, ['usuarios_nuevos', 'organizaciones_nuevas'])
  const intervalo = Math.max(0, Math.ceil(datos.length / 5) - 1)

  return (
    <PanelGrafica
      id="cdc-crecimiento"
      titulo="Crecimiento"
      subtitulo="Personas y organizaciones nuevas, acumuladas en el periodo"
      indice={6}
      cargando={cargando}
      error={error}
      vacio={vacio}
      mensajeVacio="No se registraron personas ni organizaciones nuevas en este periodo."
      onReintentar={onReintentar}
      leyenda={[
        { etiqueta: 'Personas', color: COLOR_USUARIOS },
        { etiqueta: 'Organizaciones', color: COLOR_ORGANIZACIONES },
      ]}
      resumen={
        series && (
          <>
            <span><strong>+{formatearNumero(sumarCampo(series, 'usuarios_nuevos'))}</strong> personas</span>
            <span><strong>+{formatearNumero(sumarCampo(series, 'organizaciones_nuevas'))}</strong> organizaciones</span>
          </>
        )
      }
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFechaCorta}
            tickLine={false}
            axisLine={false}
            interval={intervalo}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <Tooltip content={<TooltipGrafica />} cursor={{ stroke: 'var(--border-default)' }} />
          <Line
            type="stepAfter"
            dataKey="usuarios"
            name="Personas"
            stroke={COLOR_USUARIOS}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!sinMovimiento}
          />
          <Line
            type="stepAfter"
            dataKey="organizaciones"
            name="Organizaciones"
            stroke={COLOR_ORGANIZACIONES}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!sinMovimiento}
          />
        </LineChart>
      </ResponsiveContainer>
    </PanelGrafica>
  )
}

export default PanelCrecimiento
