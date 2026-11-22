import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { formatearFechaCorta, formatearNumero, hayActividad, sumarCampo, type MetricasAdmin } from '../model/metricas'
import PanelGrafica from './PanelGrafica'
import TooltipGrafica from './TooltipGrafica'

type Props = {
  metricas: MetricasAdmin | null
  cargando: boolean
  error: boolean
  onReintentar: () => void
}

const COLOR_MORTALIDAD = 'var(--cdc-tono-maiz)'

function PanelMortalidad({ metricas, cargando, error, onReintentar }: Props) {
  const sinMovimiento = useReducedMotion()
  const series = metricas?.series ?? []
  const vacio = metricas !== null && !hayActividad(series, ['aves_muertas'])
  const intervalo = Math.max(0, Math.ceil(series.length / 5) - 1)

  return (
    <PanelGrafica
      id="cdc-mortalidad"
      titulo="Mortalidad"
      subtitulo="Aves muertas registradas por día en toda la plataforma"
      indice={7}
      cargando={cargando}
      error={error}
      vacio={vacio}
      mensajeVacio="No se registraron aves muertas en este periodo."
      onReintentar={onReintentar}
      resumen={
        metricas && (
          <>
            <span><strong>{formatearNumero(sumarCampo(series, 'aves_muertas'))}</strong> aves muertas</span>
            <span>antes: <strong>{formatearNumero(metricas.periodo_anterior.aves_muertas)}</strong></span>
          </>
        )
      }
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            width={36}
            tickFormatter={formatearNumero}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <Tooltip content={<TooltipGrafica />} cursor={{ fill: 'var(--surface-subtle)' }} />
          <Bar
            dataKey="aves_muertas"
            name="Aves muertas"
            fill={COLOR_MORTALIDAD}
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
            isAnimationActive={!sinMovimiento}
          />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafica>
  )
}

export default PanelMortalidad
