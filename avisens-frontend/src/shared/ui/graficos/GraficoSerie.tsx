import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './GraficoSerie.css'

export type PuntoGraficoSerie = { etiqueta: string; valor: number }

type Props = {
  puntos: PuntoGraficoSerie[]
  unidad: string
  minimo: number | null
  maximo: number | null
  descripcion: string
  altura?: number
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function movimientoReducido() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Detalle({ active, payload, unidad }: {
  active?: boolean
  payload?: { payload: PuntoGraficoSerie }[]
  unidad: string
}) {
  const punto = active ? payload?.[0]?.payload : undefined
  if (!punto) return null
  return (
    <div className="gs-detalle">
      <span>{punto.etiqueta}</span>
      <strong>{decimal.format(punto.valor)} {unidad}</strong>
    </div>
  )
}

function GraficoSerie({ puntos, unidad, minimo, maximo, descripcion, altura = 200 }: Props) {
  const idDegradado = `gs-${useId().replace(/:/g, '')}`
  const hayRango = minimo !== null && maximo !== null

  return (
    <figure className="gs" aria-label={descripcion}>
      <div style={{ height: altura }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            {hayRango && (
              <ReferenceArea y1={minimo} y2={maximo} fill="var(--success)" fillOpacity={0.07} stroke="none" ifOverflow="extendDomain" />
            )}
            <XAxis
              dataKey="etiqueta" minTickGap={48} tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              width={40} tickLine={false} axisLine={false} domain={['auto', 'auto']}
              tickFormatter={(valor: number) => decimal.format(valor)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip content={<Detalle unidad={unidad} />} cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }} />
            <Area
              type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2}
              fill={`url(#${idDegradado})`} dot={false} isAnimationActive={!movimientoReducido()}
              activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hayRango && (
        <figcaption className="gs-leyenda">
          <span className="gs-clave gs-clave--rango">Rango esperado {decimal.format(minimo)}–{decimal.format(maximo)} {unidad}</span>
        </figcaption>
      )}
    </figure>
  )
}

export default GraficoSerie
