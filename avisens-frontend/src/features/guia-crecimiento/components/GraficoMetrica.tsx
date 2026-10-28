import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { useReducedMotion } from 'motion/react'
import { listarConsumosDiarios, type ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import { listarTodasLasMediciones, listarUltimasLecturas, type Medicion, type UltimaLecturaSensor } from '@features/sensores/api/mediciones'
import type { Mortalidad } from '@features/bitacora/model/bitacora'
import type { IndicadorLote, PuntoCurvaGenetica } from '../api/guiaCrecimiento'
import type { Lote } from '@features/lotes/api/lotes'
import { fechaDeHoy } from '@shared/utils/fechas'
import { mensajeDeError } from '@shared/utils/errores'
import { serieAmbiente, serieConsumo, serieFcr, serieMortalidad } from '../model/seriesMetricas'
import './GraficoMetrica.css'

export type TipoGraficaGuia = 'peso' | 'consumo' | 'mortalidad' | 'fcr' | 'ambiente'

type Props = {
  tipo: Exclude<TipoGraficaGuia, 'peso'>
  lote: Lote
  indicadores: IndicadorLote[]
  curvaGenetica: PuntoCurvaGenetica[]
  diaActual: number
}

type Fuentes = {
  consumos: ConsumoDiario[]
  mortalidades: Mortalidad[]
  mediciones: Medicion[]
  sensores: UltimaLecturaSensor[]
  cargando: boolean
  error: string
  revision: number
}

const format = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function diaHace(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fechaDeHoy(fecha)
}

function fuentesIniciales(cargando: boolean, revision = 0): Fuentes {
  return { consumos: [], mortalidades: [], mediciones: [], sensores: [], cargando, error: '', revision }
}

function GraficoMetrica({ tipo, lote, indicadores, curvaGenetica, diaActual }: Props) {
  const reducir = useReducedMotion()
  const [fuentes, setFuentes] = useState(() => fuentesIniciales(tipo !== 'fcr'))
  const [revision, setRevision] = useState(0)
  const cargar = useCallback(() => setRevision((valor) => valor + 1), [])
  const loteId = lote.id
  const galponId = lote.galpon.id
  const fechaIngreso = lote.fecha_ingreso
  const cantidadInicial = lote.cantidad_inicial

  useEffect(() => {
    if (tipo === 'fcr') {
      setFuentes(fuentesIniciales(false, revision))
      return
    }
    let vigente = true
    setFuentes({ ...fuentesIniciales(true, revision), error: '' })
    const cargarDatos = async () => {
      try {
        if (tipo === 'consumo') {
          const [consumos, mortalidades] = await Promise.all([
            listarConsumosDiarios(),
            listarTodasLasPaginas<Mortalidad>('/registros-mortalidad'),
          ])
          if (vigente) setFuentes({ ...fuentesIniciales(false, revision), consumos: consumos.filter((dato) => dato.lote_id === loteId), mortalidades: mortalidades.filter((dato) => dato.lote_id === loteId) })
          return
        }
        if (tipo === 'mortalidad') {
          const mortalidades = await listarTodasLasPaginas<Mortalidad>('/registros-mortalidad')
          if (vigente) setFuentes({ ...fuentesIniciales(false, revision), mortalidades: mortalidades.filter((dato) => dato.lote_id === loteId) })
          return
        }
        const sensores = (await listarUltimasLecturas()).filter((sensor) => sensor.galpon_id === galponId && /temp|hum/i.test(sensor.tipo))
        const hasta = fechaDeHoy()
        const desde = diaHace(6)
        const mediciones = (await Promise.all(sensores.map((sensor) => listarTodasLasMediciones({ sensor_id: sensor.sensor_id, desde, hasta })))).flat()
        if (vigente) setFuentes({ ...fuentesIniciales(false, revision), sensores, mediciones })
      } catch (fallo) {
        if (vigente) setFuentes({ ...fuentesIniciales(false, revision), error: mensajeDeError(fallo, 'No se pudieron cargar los datos de esta gráfica.') })
      }
    }
    void cargarDatos()
    return () => { vigente = false }
  }, [tipo, loteId, galponId, revision])

  const puntos = useMemo(() => {
    if (tipo === 'consumo') return serieConsumo(fuentes.consumos, fuentes.mortalidades, fechaIngreso, cantidadInicial, diaActual, curvaGenetica)
    if (tipo === 'mortalidad') return serieMortalidad(fuentes.mortalidades, fechaIngreso, cantidadInicial, diaActual)
    if (tipo === 'fcr') return serieFcr(indicadores, curvaGenetica)
    return []
  }, [tipo, fuentes.consumos, fuentes.mortalidades, fechaIngreso, cantidadInicial, diaActual, curvaGenetica, indicadores])

  const puntosAmbiente = useMemo(() => serieAmbiente(fuentes.mediciones, fuentes.sensores), [fuentes.mediciones, fuentes.sensores])
  const esAmbiente = tipo === 'ambiente'
  const tieneDatos = esAmbiente ? puntosAmbiente.length > 0 : puntos.some((punto) => punto.real !== null)
  const titulo = tipo === 'consumo' ? 'Consumo diario por ave' : tipo === 'mortalidad' ? 'Mortalidad acumulada' : tipo === 'fcr' ? 'Conversión del alimento' : 'Temperatura y humedad del galpón'
  const unidad = tipo === 'consumo' ? 'g por ave' : tipo === 'mortalidad' ? '%' : 'FCR'
  const rutaBitacora = `/bitacora?lote=${loteId}&vista=${tipo === 'consumo' ? 'consumo' : 'mortalidad'}`
  const enlaceAccion = tipo === 'ambiente'
    ? `/granjas?granjaId=${lote.galpon.granja.id}&galpon=${galponId}&pestana=ambiente`
    : tipo === 'fcr' ? `/bitacora?lote=${loteId}&vista=peso` : rutaBitacora
  const textoVacio = tipo === 'consumo'
    ? 'Todavía no hay consumo registrado para comparar con el plan de alimentación.'
    : tipo === 'mortalidad'
      ? 'Todavía no hay registros de mortalidad para este lote.'
      : tipo === 'fcr'
        ? 'Registra pesajes y consumo para mostrar la conversión.'
        : 'Este galpón no tiene lecturas de temperatura o humedad en los últimos siete días.'
  const accionVacia = tipo === 'ambiente' ? 'Ver el ambiente del galpón' : tipo === 'fcr' ? 'Registrar un pesaje' : tipo === 'consumo' ? 'Registrar consumo' : 'Registrar mortalidad'

  return (
    <section className="gcm" aria-labelledby="gcm-titulo" aria-busy={fuentes.cargando}>
      <header className="gcm-cabecera">
        <div>
          <h3 id="gcm-titulo">{titulo}</h3>
          <p>{esAmbiente ? 'Lecturas registradas en este galpón durante los últimos siete días.' : `Datos registrados por día · ${unidad}`}</p>
        </div>
        <button type="button" className="adm-btn adm-btn--secundario" onClick={cargar} disabled={fuentes.cargando}>Actualizar</button>
      </header>
      {fuentes.cargando ? (
        <p className="gcm-estado" role="status">Cargando datos de la gráfica…</p>
      ) : fuentes.error ? (
        <div className="gcm-estado" role="alert"><span>{fuentes.error}</span><button type="button" className="adm-btn adm-btn--secundario" onClick={cargar}>Reintentar</button></div>
      ) : !tieneDatos ? (
        <div className="gcm-vacio">
          <p>{textoVacio}</p>
          <Link className="adm-btn adm-btn--primario" to={enlaceAccion}>{accionVacia}</Link>
        </div>
      ) : (
        <div className="gcm-grafico" role="img" aria-label={`${titulo}. ${esAmbiente ? `${puntosAmbiente.length} horas con lecturas` : `${puntos.length} días`}`}>
          <ResponsiveContainer width="100%" height="100%">
            {esAmbiente ? (
              <LineChart data={puntosAmbiente} margin={{ top: 16, right: 12, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={(valor: string) => new Date(valor).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit' })} minTickGap={32} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                <YAxis yAxisId="temperatura" tickFormatter={(valor: number) => `${format.format(valor)}°`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="humedad" orientation="right" tickFormatter={(valor: number) => `${format.format(valor)}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(valor) => new Date(String(valor)).toLocaleString('es-CO')} formatter={(valor, nombre) => [`${format.format(Number(valor))}${nombre === 'Temperatura' ? ' °C' : ' %'}`, nombre]} />
                <Line yAxisId="temperatura" name="Temperatura" dataKey="temperatura" stroke="var(--primary)" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={!reducir} />
                <Line yAxisId="humedad" name="Humedad" dataKey="humedad" stroke="var(--avisens-maize)" strokeWidth={2} dot={false} connectNulls isAnimationActive={!reducir} />
              </LineChart>
            ) : (
              <LineChart data={puntos} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="dia" type="number" domain={[1, 'dataMax']} tickFormatter={(valor: number) => `Día ${valor}`} minTickGap={24} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                <YAxis width={68} tickFormatter={(valor: number) => tipo === 'consumo' ? `${format.format(valor)} g` : tipo === 'mortalidad' ? `${format.format(valor)}%` : format.format(valor)} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(valor) => `Día ${valor}`} formatter={(valor, nombre) => [`${format.format(Number(valor))}${tipo === 'consumo' ? ' g/ave' : tipo === 'mortalidad' ? ' %' : ''}`, nombre]} />
                {tipo === 'mortalidad' && <ReferenceLine y={0} stroke="var(--border-default)" />}
                <Line name="Registrado" dataKey="real" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={!reducir} />
                {(tipo === 'consumo' || tipo === 'fcr') && <Line name="Esperado" dataKey="esperado" stroke="var(--avisens-maize)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={!reducir} />}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default GraficoMetrica
