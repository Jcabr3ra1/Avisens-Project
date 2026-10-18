import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { marcasDePeso } from './escalas'
import './GraficoCrecimiento.css'

export type PuntoCurvaCrecimiento = {
  dia: number
  real_g: number | null
  proyectado_g: number
  min_g: number
  max_g: number
  estandar_g: number | null
  marca_g: number | null
}

type Props = {
  serie: PuntoCurvaCrecimiento[]
  diaActual: number
  pesoObjetivoG: number | null
  etiquetaEstandar: string | null
  etiquetaMarca: string | null
  descripcion: string
  altura?: number
}

type PuntoGrafico = PuntoCurvaCrecimiento & { banda: [number, number] }

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const kg = (gramos: number) => `${(gramos / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`

function movimientoReducido() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Detalle({ active, payload, etiquetaEstandar, etiquetaMarca }: {
  active?: boolean
  payload?: { payload: PuntoGrafico }[]
  etiquetaEstandar: string | null
  etiquetaMarca: string | null
}) {
  const punto = active ? payload?.[0]?.payload : undefined
  if (!punto) return null
  return (
    <div className="gc-detalle">
      <strong>Día {punto.dia}</strong>
      {punto.real_g !== null && <span className="gc-detalle-fila gc-detalle-fila--real">Pesaje <b>{numero.format(punto.real_g)} g</b></span>}
      <span className="gc-detalle-fila gc-detalle-fila--proyeccion">Proyección <b>{numero.format(punto.proyectado_g)} g</b></span>
      <span className="gc-detalle-rango">Rango probable {numero.format(punto.min_g)}–{numero.format(punto.max_g)} g</span>
      {punto.estandar_g !== null && etiquetaEstandar && <span className="gc-detalle-fila gc-detalle-fila--estandar">{etiquetaEstandar} <b>{numero.format(punto.estandar_g)} g</b></span>}
      {punto.marca_g !== null && etiquetaMarca && <span className="gc-detalle-fila gc-detalle-fila--marca">{etiquetaMarca} <b>{numero.format(punto.marca_g)} g</b></span>}
    </div>
  )
}

function GraficoCrecimiento({
  serie, diaActual, pesoObjetivoG, etiquetaEstandar, etiquetaMarca, descripcion, altura = 420,
}: Props) {
  const datos: PuntoGrafico[] = serie.map((punto) => ({ ...punto, banda: [punto.min_g, punto.max_g] }))
  const animar = !movimientoReducido()
  const hayMarca = etiquetaMarca !== null && serie.some((punto) => punto.marca_g !== null)
  const hayEstandar = etiquetaEstandar !== null && serie.some((punto) => punto.estandar_g !== null)
  const diaFinal = serie[serie.length - 1]?.dia ?? diaActual
  const maximo = Math.max(
    pesoObjetivoG ?? 0,
    ...serie.flatMap((p) => [p.max_g, p.estandar_g ?? 0, p.marca_g ?? 0, p.real_g ?? 0]),
  )
  const marcas = marcasDePeso(maximo)

  return (
    <figure className="gc" aria-label={descripcion}>
      <div className="gc-lienzo" style={{ height: altura }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 26, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="gc-banda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="dia" type="number" domain={[1, diaFinal]} tickCount={8} allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              label={{ value: 'Día de vida', position: 'insideBottomRight', offset: -2, fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis
              ticks={marcas} domain={[0, marcas[marcas.length - 1]]}
              tickFormatter={kg} width={56} tickLine={false} axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip
              content={<Detalle etiquetaEstandar={etiquetaEstandar} etiquetaMarca={etiquetaMarca} />}
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
            />
            <Area dataKey="banda" stroke="none" fill="url(#gc-banda)" isAnimationActive={animar} activeDot={false} />
            {hayMarca && (
              <Line dataKey="marca_g" stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="2 4" dot={false} connectNulls isAnimationActive={animar} activeDot={false} />
            )}
            {hayEstandar && (
              <Line dataKey="estandar_g" stroke="var(--avisens-maize)" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={animar} activeDot={false} />
            )}
            <Line dataKey="proyectado_g" stroke="var(--primary)" strokeWidth={2.5} strokeDasharray="7 5" dot={false} isAnimationActive={animar} activeDot={{ r: 4, fill: 'var(--primary)' }} />
            <Line
              dataKey="real_g" stroke="transparent" isAnimationActive={animar}
              dot={{ r: 5, fill: 'var(--avisens-ink)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--avisens-ink)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
            />
            {pesoObjetivoG !== null && (
              <ReferenceLine
                y={pesoObjetivoG} stroke="var(--danger)" strokeDasharray="4 4"
                label={{ value: `Objetivo ${kg(pesoObjetivoG)}`, position: 'insideTopLeft', fill: 'var(--danger)', fontSize: 12 }}
              />
            )}
            {diaActual >= 1 && diaActual <= diaFinal && (
              <ReferenceLine
                x={diaActual} stroke="var(--text-secondary)"
                label={{ value: 'Hoy', position: 'top', fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="gc-leyenda">
        <span className="gc-clave gc-clave--real">Pesajes del lote</span>
        <span className="gc-clave gc-clave--proyeccion">Proyección</span>
        <span className="gc-clave gc-clave--banda">Rango probable (90 %)</span>
        {hayEstandar && <span className="gc-clave gc-clave--estandar">{etiquetaEstandar}</span>}
        {hayMarca && <span className="gc-clave gc-clave--marca">{etiquetaMarca}</span>}
        {pesoObjetivoG !== null && <span className="gc-clave gc-clave--objetivo">Peso objetivo</span>}
      </figcaption>
    </figure>
  )
}

export default GraficoCrecimiento
