import { useId } from 'react'
import {
  Area, CartesianGrid, ComposedChart, ReferenceArea, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { HoraRiesgoCalor } from '../api/predicciones'
import {
  ETIQUETA_NIVEL, esMedianoche, etiquetaHoraCorta, etiquetaHoraLarga, horaPico, type FranjaCalor,
} from '../model/riesgoCalor'
import './GraficoRiesgoCalor.css'

type Props = {
  serie: HoraRiesgoCalor[]
  franjas: FranjaCalor[]
  descripcion: string
  altura?: number
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const COLOR_NIVEL: Record<FranjaCalor['nivel'], string> = {
  atencion: 'var(--calor-atencion)',
  alerta: 'var(--calor-alerta)',
  peligro: 'var(--calor-peligro)',
  emergencia: 'var(--calor-emergencia)',
}

function movimientoReducido() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Detalle({ active, payload }: { active?: boolean; payload?: { payload: HoraRiesgoCalor }[] }) {
  const punto = active ? payload?.[0]?.payload : undefined
  if (!punto) return null
  return (
    <div className="grc-detalle">
      <span className="grc-detalle-hora">{etiquetaHoraLarga(punto.hora)}</span>
      <span className="grc-detalle-thi">
        THI <strong>{decimal.format(punto.thi)}</strong>
        <span className={`grc-nivel grc-nivel--${punto.nivel}`}>{ETIQUETA_NIVEL[punto.nivel]}</span>
      </span>
      <span>{decimal.format(punto.temperatura)} °C · {decimal.format(punto.humedad)} % de humedad</span>
    </div>
  )
}

function dominio(serie: HoraRiesgoCalor[], franjas: FranjaCalor[]): [number, number] {
  const valores = serie.map((hora) => hora.thi)
  const inicioRiesgo = franjas[0]?.desde ?? 30
  const minimo = Math.floor(Math.min(...valores)) - 2
  const maximo = Math.max(Math.ceil(Math.max(...valores)) + 2, inicioRiesgo + 3)
  return [minimo, maximo]
}

function GraficoRiesgoCalor({ serie, franjas, descripcion, altura = 260 }: Props) {
  const idDegradado = `grc-${useId().replace(/:/g, '')}`
  const [minimo, maximo] = dominio(serie, franjas)
  const pico = horaPico(serie)
  const marcas = serie.filter((hora) => /T(00|12):00$/.test(hora.hora)).map((hora) => hora.hora)
  const inicioRiesgo = franjas[0]?.desde

  return (
    <figure className="grc" aria-label={descripcion}>
      <div style={{ height: altura }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={serie} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {franjas.map((franja) => (
              <ReferenceArea
                key={franja.nivel}
                y1={franja.desde}
                y2={franja.hasta ?? maximo}
                fill={COLOR_NIVEL[franja.nivel]}
                fillOpacity={0.14}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            {serie.filter((hora) => esMedianoche(hora.hora)).map((hora) => (
              <ReferenceLine key={hora.hora} x={hora.hora} stroke="var(--border-default)" strokeDasharray="2 4" />
            ))}
            {inicioRiesgo !== undefined && (
              <ReferenceLine
                y={inicioRiesgo}
                stroke="var(--calor-atencion-borde)"
                strokeDasharray="5 4"
                label={{ value: 'Empieza el riesgo', position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 11 }}
              />
            )}
            <XAxis
              dataKey="hora" ticks={marcas} interval={0} tickLine={false}
              tickFormatter={etiquetaHoraCorta}
              axisLine={{ stroke: 'var(--border-default)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              width={36} tickLine={false} axisLine={false} domain={[minimo, maximo]} allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip content={<Detalle />} cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }} />
            <Area
              type="monotone" dataKey="thi" stroke="var(--primary)" strokeWidth={2}
              fill={`url(#${idDegradado})`} dot={false} isAnimationActive={!movimientoReducido()}
              activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface-base)', strokeWidth: 2 }}
            />
            {pico && (
              <ReferenceDot
                x={pico.hora} y={pico.thi} r={5}
                fill={pico.nivel === 'confort' ? 'var(--primary)' : COLOR_NIVEL[pico.nivel]}
                stroke="var(--surface-base)" strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="grc-leyenda">
        {franjas.map((franja) => (
          <span key={franja.nivel} className={`grc-clave grc-clave--${franja.nivel}`}>
            {ETIQUETA_NIVEL[franja.nivel]} {franja.hasta === null ? `desde ${franja.desde}` : `${franja.desde}–${franja.hasta}`}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

export default GraficoRiesgoCalor
