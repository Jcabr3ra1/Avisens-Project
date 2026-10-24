import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
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
  diaSeleccionado?: number
  mostrarProyeccion?: boolean
}

type PuntoGrafico = PuntoCurvaCrecimiento & { banda: [number, number] }

function movimientoReducido() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Detalle({ active, payload, etiquetaEstandar, etiquetaMarca, mostrarProyeccion }: {
  active?: boolean
  payload?: { payload: PuntoGrafico }[]
  etiquetaEstandar: string | null
  etiquetaMarca: string | null
  mostrarProyeccion: boolean
}) {
  const punto = active ? payload?.[0]?.payload : undefined
  if (!punto) return null
  return (
    <div className="gc-detalle">
      <strong>Día {punto.dia}</strong>
      {punto.real_g !== null && (
        <span className="gc-detalle-fila gc-detalle-fila--real">
          Pesaje <b>{formatearPeso(punto.real_g)}</b>
        </span>
      )}
      {mostrarProyeccion && <>
        <span className="gc-detalle-fila gc-detalle-fila--proyeccion">
          Proyección <b>{formatearPeso(punto.proyectado_g)}</b>
        </span>
        <span className="gc-detalle-rango">
          Rango probable {formatearPeso(punto.min_g)} – {formatearPeso(punto.max_g)}
        </span>
      </>}
      {punto.estandar_g !== null && etiquetaEstandar && (
        <span className="gc-detalle-fila gc-detalle-fila--estandar">
          {etiquetaEstandar} <b>{formatearPeso(punto.estandar_g)}</b>
        </span>
      )}
      {punto.marca_g !== null && etiquetaMarca && (
        <span className="gc-detalle-fila gc-detalle-fila--marca">
          {etiquetaMarca} <b>{formatearPeso(punto.marca_g)}</b>
        </span>
      )}
    </div>
  )
}

function crearEtiquetaFinal(texto: string, color: string, ultimoIndice: number, desplazamientoY = 3) {
  return function EtiquetaFinal(props: { x?: number | string; y?: number | string; index?: number }) {
    const xNum = typeof props.x === 'number' ? props.x : Number(props.x)
    const yNum = typeof props.y === 'number' ? props.y : Number(props.y)
    if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || props.index !== ultimoIndice) return null
    return (
      <text x={xNum + 8} y={yNum + desplazamientoY} fill={color} fontSize={11} fontWeight={700}>{texto}</text>
    )
  }
}

function GraficoCrecimiento({
  serie, diaActual, pesoObjetivoG, etiquetaEstandar, etiquetaMarca, descripcion, altura = 420,
  diaSeleccionado = diaActual, mostrarProyeccion = true,
}: Props) {
  const datos: PuntoGrafico[] = serie.map((punto) => ({ ...punto, banda: [punto.min_g, punto.max_g] }))
  const animar = !movimientoReducido()
  const hayMarca = etiquetaMarca !== null && serie.some((punto) => punto.marca_g !== null)
  const hayEstandar = etiquetaEstandar !== null && serie.some((punto) => punto.estandar_g !== null)
  const diaFinal = serie[serie.length - 1]?.dia ?? diaActual
  const maximo = Math.max(pesoObjetivoG ?? 0, ...serie.flatMap((p) => [
    mostrarProyeccion ? p.max_g : 0,
    p.estandar_g ?? 0,
    p.marca_g ?? 0,
    p.real_g ?? 0,
  ]))
  const marcas = marcasDePeso(maximo)

  const marcasDias = [1, ...Array.from({ length: Math.floor(diaFinal / 7) }, (_, i) => (i + 1) * 7)]
  if (!marcasDias.includes(diaFinal) && diaFinal - marcasDias[marcasDias.length - 1] >= 3) {
    marcasDias.push(diaFinal)
  }
  const idxFinProyeccion = datos.length - 1
  const idxFinEstandar = datos.map((d) => d.estandar_g !== null).lastIndexOf(true)
  const idxFinMarca = datos.map((d) => d.marca_g !== null).lastIndexOf(true)

  const ultimoDato = datos[datos.length - 1]
  const proyectadoFin = ultimoDato?.proyectado_g ?? 0
  const estandarFin = ultimoDato?.estandar_g ?? null
  const colisionan = estandarFin !== null && Math.abs(proyectadoFin - estandarFin) < 220
  const despProyeccion = colisionan ? (proyectadoFin >= estandarFin ? -5 : 12) : 3
  const despEstandar = colisionan ? (proyectadoFin >= estandarFin ? 12 : -5) : 3

  const formateadorEje = (gramos: number) => {
    if (gramos === 0) return '0'
    if (gramos < 1000) return `${gramos} g`
    const val = gramos / 1000
    return `${val.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`
  }

  return (
    <figure className="gc" aria-label={descripcion}>
      <div className="gc-lienzo" style={{ height: altura }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 28, right: 105, bottom: 6, left: 4 }}>
            <defs>
              <linearGradient id="gc-banda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="dia" type="number" domain={[1, diaFinal]} ticks={marcasDias} allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              label={{ value: 'Día de vida', position: 'insideBottomRight', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              ticks={marcas} domain={[0, marcas[marcas.length - 1]]}
              tickFormatter={formateadorEje} width={60} tickLine={false} axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip
              content={<Detalle etiquetaEstandar={etiquetaEstandar} etiquetaMarca={etiquetaMarca} mostrarProyeccion={mostrarProyeccion} />}
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
            />
            {mostrarProyeccion && <Area dataKey="banda" stroke="none" fill="url(#gc-banda)" isAnimationActive={animar} activeDot={false} />}
            {hayMarca && (
              <Line
                dataKey="marca_g"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
                isAnimationActive={animar}
                activeDot={false}
                label={crearEtiquetaFinal(etiquetaMarca ?? 'Alimento', '#94a3b8', idxFinMarca)}
              />
            )}
            {hayEstandar && (
              <Line
                dataKey="estandar_g"
                stroke="#94a3b8"
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={animar}
                activeDot={false}
                label={crearEtiquetaFinal(etiquetaEstandar ?? 'Estándar', '#64748b', idxFinEstandar, despEstandar)}
              />
            )}
            {mostrarProyeccion && <Line dataKey="proyectado_g" stroke="var(--primary)" strokeWidth={3} strokeDasharray="7 5" dot={false} isAnimationActive={animar} activeDot={{ r: 5, fill: 'var(--primary)' }}
              label={crearEtiquetaFinal('Proyección', 'var(--primary)', idxFinProyeccion, despProyeccion)}
            />}
            <Line
              dataKey="real_g" stroke="transparent" isAnimationActive={animar}
              dot={{ r: 5, fill: 'var(--primary-hover, #0f172a)', stroke: 'var(--surface-base, #ffffff)', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: 'var(--primary)', stroke: 'var(--surface-base, #ffffff)', strokeWidth: 2 }}
            />
            {pesoObjetivoG !== null && (
              <ReferenceLine
                y={pesoObjetivoG} stroke="var(--danger)" strokeDasharray="4 4"
                label={{ value: `Meta ${formatearPeso(pesoObjetivoG)}`, position: 'insideTopLeft', fill: 'var(--danger)', fontSize: 11, fontWeight: 600 }}
              />
            )}
            {diaSeleccionado >= 1 && diaSeleccionado <= diaFinal && (
              <ReferenceLine
                x={diaSeleccionado} stroke="var(--avisens-maize)" strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: diaSeleccionado === diaActual ? `Hoy · Día ${diaSeleccionado}` : `Día ${diaSeleccionado}`, position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export default GraficoCrecimiento
