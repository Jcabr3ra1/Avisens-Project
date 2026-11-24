import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

const COLOR_MEDICIONES = 'var(--avisens-deep)'
const COLOR_ALERTAS = 'var(--danger)'

function PanelActividadPlataforma({ metricas, cargando, error, onReintentar }: Props) {
  const sinMovimiento = useReducedMotion()
  const series = metricas?.series ?? []
  const vacio = metricas !== null && !hayActividad(series, ['mediciones', 'alertas'])
  const intervalo = Math.max(0, Math.ceil(series.length / 7) - 1)

  return (
    <PanelGrafica
      id="cdc-actividad-plataforma"
      titulo="Actividad de la plataforma"
      subtitulo={metricas ? `Mediciones recibidas y alertas generadas por día, últimos ${metricas.dias} días` : 'Mediciones recibidas y alertas generadas por día'}
      indice={5}
      cargando={cargando}
      error={error}
      vacio={vacio}
      mensajeVacio="Cuando los controladores envíen mediciones aparecerán aquí."
      onReintentar={onReintentar}
      leyenda={[
        { etiqueta: 'Mediciones', color: COLOR_MEDICIONES },
        { etiqueta: 'Alertas', color: COLOR_ALERTAS },
      ]}
      resumen={
        metricas && (
          <>
            <span><strong>{formatearNumero(sumarCampo(series, 'mediciones'))}</strong> mediciones</span>
            <span><strong>{formatearNumero(sumarCampo(series, 'alertas'))}</strong> alertas</span>
            <span><strong>{formatearNumero(metricas.actuales.mediciones_hoy)}</strong> mediciones hoy</span>
          </>
        )
      }
      alturaClase="cdc-grafica-lienzo--grande"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cdc-grad-mediciones" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_MEDICIONES} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLOR_MEDICIONES} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            yAxisId="mediciones"
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatearNumero}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis yAxisId="alertas" orientation="right" hide />
          <Tooltip content={<TooltipGrafica />} cursor={{ stroke: 'var(--border-default)' }} />
          <Area
            yAxisId="mediciones"
            type="monotone"
            dataKey="mediciones"
            name="Mediciones"
            stroke={COLOR_MEDICIONES}
            strokeWidth={2}
            fill="url(#cdc-grad-mediciones)"
            isAnimationActive={!sinMovimiento}
          />
          <Bar
            yAxisId="alertas"
            dataKey="alertas"
            name="Alertas"
            fill={COLOR_ALERTAS}
            fillOpacity={0.75}
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
            isAnimationActive={!sinMovimiento}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </PanelGrafica>
  )
}

export default PanelActividadPlataforma
