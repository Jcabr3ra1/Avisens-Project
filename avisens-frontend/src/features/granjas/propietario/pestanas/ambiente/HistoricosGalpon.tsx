import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  consultarHistoricoMediciones,
  type HistoricoMedicionesResponse,
  type PuntoHistorico,
  type VariableHistorico,
} from '@features/sensores/api/mediciones'
import Modal from '@shared/ui/Modal/Modal'
import { IcDoc } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import type { GalponConLotes } from '../../../hooks/useEstructuraGranjas'
import { generarPdfHistorico } from './generarPdfHistorico'

type Props = {
  galpon: GalponConLotes
}

const VARIABLES: Array<{ id: VariableHistorico; etiqueta: string }> = [
  { id: 'temperatura', etiqueta: 'Temperatura (°C)' },
  { id: 'humedad', etiqueta: 'Humedad (%)' },
  { id: 'co2', etiqueta: 'CO₂ (ppm)' },
  { id: 'nh3', etiqueta: 'Amoníaco NH₃ (ppm)' },
  { id: 'luminosidad', etiqueta: 'Luminosidad (lux)' },
]

const ATAJOS_DIAS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '3 meses' },
  { dias: 365, etiqueta: '12 meses' },
] as const

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function fechaInputHoy(diasAtras = 0): string {
  const fecha = new Date(Date.now() - diasAtras * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}

function isoDesdeInput(fechaYmd: string, finDelDia = false): string {
  return finDelDia
    ? `${fechaYmd}T23:59:59.999-05:00`
    : `${fechaYmd}T00:00:00.000-05:00`
}

function ymdDeIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fechaInputHoy()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function formatearEjeFecha(iso: string, granularidad: 'hora' | 'dia'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    ...(granularidad === 'hora' ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

type PuntoGrafico = PuntoHistorico & {
  rangoObjetivo: [number, number] | null
  rangoMinMax: [number, number]
}

function TooltipHistorico({
  active,
  payload,
  unidad,
  granularidad,
}: {
  active?: boolean
  payload?: Array<{ payload: PuntoGrafico }>
  unidad: string
  granularidad: 'hora' | 'dia'
}) {
  const punto = active ? payload?.[0]?.payload : undefined
  if (!punto) return null

  return (
    <div className="amb-hist-tooltip">
      <strong>{formatearEjeFecha(punto.fecha, granularidad)}</strong>
      <span>
        Promedio: <strong>{decimal.format(punto.promedio)} {unidad}</strong>
      </span>
      <span>
        Mín / Máx: {decimal.format(punto.minimo)} – {decimal.format(punto.maximo)} {unidad}
      </span>
      {punto.objetivo_min !== null && punto.objetivo_max !== null && (
        <span>
          Objetivo: {decimal.format(punto.objetivo_min)} – {decimal.format(punto.objetivo_max)} {unidad}
        </span>
      )}
      <small>{punto.lecturas} lecturas</small>
    </div>
  )
}

export default function HistoricosGalpon({ galpon }: Props) {
  const [variable, setVariable] = useState<VariableHistorico>('temperatura')
  const [zonaId, setZonaId] = useState<string>('')
  const [desde, setDesde] = useState<string>(() => fechaInputHoy(30))
  const [hasta, setHasta] = useState<string>(() => fechaInputHoy(0))
  const [datos, setDatos] = useState<HistoricoMedicionesResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return
    if (desde > hasta) {
      setError('La fecha inicial debe ser anterior o igual a la fecha final.')
      return
    }
    const diffDias = (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000
    if (diffDias > 366) {
      setError('El rango máximo de consulta histórica es de 12 meses (366 días).')
      return
    }

    setCargando(true)
    setError('')
    try {
      const res = await consultarHistoricoMediciones({
        galpon_id: galpon.id,
        variable,
        zona_id: zonaId ? Number(zonaId) : undefined,
        desde: isoDesdeInput(desde, false),
        hasta: isoDesdeInput(hasta, true),
      })
      setDatos(res)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo consultar el historial ambiental.'))
    } finally {
      setCargando(false)
    }
  }, [galpon.id, variable, zonaId, desde, hasta])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const serieGrafico = useMemo<PuntoGrafico[]>(() => {
    if (!datos) return []
    return datos.serie.map((punto) => ({
      ...punto,
      rangoObjetivo:
        punto.objetivo_min !== null && punto.objetivo_max !== null
          ? [punto.objetivo_min, punto.objetivo_max]
          : null,
      rangoMinMax: [punto.minimo, punto.maximo],
    }))
  }, [datos])

  function aplicarAtajo(dias: number) {
    setDesde(fechaInputHoy(dias))
    setHasta(fechaInputHoy(0))
  }

  function aplicarRangoSugerido() {
    if (!datos?.rango_sugerido) return
    setDesde(ymdDeIso(datos.rango_sugerido.desde))
    setHasta(ymdDeIso(datos.rango_sugerido.hasta))
  }

  function abrirPdf() {
    if (!datos || datos.serie.length === 0) return
    const bytes = generarPdfHistorico(datos)
    const copia = new Uint8Array(bytes.byteLength)
    copia.set(bytes)
    const blob = new Blob([copia], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setPdfUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior)
      return url
    })
  }

  function cerrarPdf() {
    setPdfUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior)
      return null
    })
  }

  const hayObjetivo = serieGrafico.some((p) => p.rangoObjetivo !== null)

  return (
    <section className="amb-tarjeta amb-hist" aria-labelledby="amb-hist-titulo">
      <div className="amb-seccion-cabecera">
        <div>
          <span className="amb-rotulo amb-rotulo--suave">Históricos ambientales (hasta 12 meses)</span>
          <h3 id="amb-hist-titulo">Tendencia histórica por variable y zona</h3>
          <p>Analiza el comportamiento pasado frente a los umbrales objetivo configurados para el galpón.</p>
        </div>

        <button
          type="button"
          className="adm-btn adm-btn--primario"
          onClick={abrirPdf}
          disabled={!datos || datos.sin_datos || cargando}
        >
          <IcDoc size={15} aria-hidden="true" />
          <span>Ver PDF</span>
        </button>
      </div>

      <div className="amb-hist-controles">
        <label className="amb-hist-campo">
          <span>Variable</span>
          <select
            value={variable}
            onChange={(e) => setVariable(e.target.value as VariableHistorico)}
          >
            {VARIABLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="amb-hist-campo">
          <span>Zona del galpón</span>
          <select value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
            <option value="">Todas las zonas</option>
            {(datos?.zonas ?? []).map((zona) => (
              <option key={zona.id} value={String(zona.id)}>
                {zona.codigo ? `${zona.nombre} (${zona.codigo})` : zona.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="amb-hist-campo">
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            max={hasta || fechaInputHoy(0)}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>

        <label className="amb-hist-campo">
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            min={desde}
            max={fechaInputHoy(0)}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
      </div>

      <div className="amb-hist-atajos" role="group" aria-label="Rangos rápidos">
        {ATAJOS_DIAS.map((atajo) => (
          <button
            key={atajo.dias}
            type="button"
            className="amb-hist-atajo"
            onClick={() => aplicarAtajo(atajo.dias)}
          >
            Últimos {atajo.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void cargar()}>Reintentar</button>
        </div>
      )}

      {cargando ? (
        <p className="adm-aviso" role="status">Consultando mediciones históricas…</p>
      ) : datos?.sin_datos ? (
        <div className="amb-hist-vacio" role="status">
          <strong>{datos.mensaje ?? 'No existen registros para el rango seleccionado'}</strong>
          {datos.rango_sugerido ? (
            <div className="amb-hist-sugerencia">
              <span>
                Rango disponible sugerido:{' '}
                <strong>
                  {ymdDeIso(datos.rango_sugerido.desde)} al {ymdDeIso(datos.rango_sugerido.hasta)}
                </strong>
              </span>
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={aplicarRangoSugerido}
              >
                Usar rango sugerido
              </button>
            </div>
          ) : (
            <p>Aún no hay lecturas almacenadas para esta variable o zona en el galpón.</p>
          )}
        </div>
      ) : datos ? (
        <>
          <div className="amb-hist-kpis">
            <div className="amb-hist-kpi">
              <span>Promedio</span>
              <strong>
                {datos.resumen.promedio_general !== null
                  ? `${decimal.format(datos.resumen.promedio_general)} ${datos.unidad_medida}`
                  : '—'}
              </strong>
            </div>
            <div className="amb-hist-kpi">
              <span>Mínimo / Máximo</span>
              <strong>
                {datos.resumen.minimo_general !== null && datos.resumen.maximo_general !== null
                  ? `${decimal.format(datos.resumen.minimo_general)} / ${decimal.format(datos.resumen.maximo_general)} ${datos.unidad_medida}`
                  : '—'}
              </strong>
            </div>
            <div className="amb-hist-kpi">
              <span>Lecturas procesadas</span>
              <strong>{datos.resumen.total_lecturas.toLocaleString('es-CO')}</strong>
            </div>
            <div className="amb-hist-kpi">
              <span>Fuera de objetivo</span>
              <strong>{datos.resumen.puntos_fuera_de_rango}</strong>
            </div>
          </div>

          <div className="amb-hist-grafico" style={{ height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieGrafico} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(val: string) => formatearEjeFecha(val, datos.granularidad)}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  unit={` ${datos.unidad_medida}`}
                  width={56}
                />
                <Tooltip
                  content={
                    <TooltipHistorico
                      unidad={datos.unidad_medida}
                      granularidad={datos.granularidad}
                    />
                  }
                />
                {hayObjetivo && (
                  <Area
                    type="monotone"
                    dataKey="rangoObjetivo"
                    name="Rango objetivo"
                    stroke="none"
                    fill="var(--success)"
                    fillOpacity={0.14}
                  />
                )}
                {hayObjetivo && (
                  <Line
                    type="monotone"
                    dataKey="objetivo_max"
                    name="Objetivo máx."
                    stroke="var(--success)"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={1.5}
                  />
                )}
                {hayObjetivo && (
                  <Line
                    type="monotone"
                    dataKey="objetivo_min"
                    name="Objetivo mín."
                    stroke="var(--success)"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={1.5}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="promedio"
                  name="Promedio real"
                  stroke="var(--primary)"
                  strokeWidth={2.2}
                  dot={serieGrafico.length <= 24 ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="amb-fuente">
            Agrupación {datos.granularidad === 'hora' ? 'horaria' : 'diaria'} ·{' '}
            {hayObjetivo
              ? 'La franja verde indica el rango objetivo según la semana de vida vigente.'
              : 'No hay umbral configurado para esta variable en el galpón.'}
          </p>
        </>
      ) : null}

      {pdfUrl && (
        <Modal
          titulo={`Reporte histórico en PDF · ${galpon.nombre}`}
          subtitulo="Vista previa generada directamente en PDF."
          onCerrar={cerrarPdf}
          ancho="ancho"
          acciones={
            <>
              <a
                href={pdfUrl}
                download={`historico-${galpon.codigo}-${variable}.pdf`}
                className="modal-btn modal-btn--secondary"
              >
                Descargar PDF
              </a>
              <button
                type="button"
                className="modal-btn modal-btn--primary"
                onClick={cerrarPdf}
              >
                Cerrar
              </button>
            </>
          }
        >
          <div className="amb-hist-pdf-marco">
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              title={`Reporte histórico PDF de ${galpon.nombre}`}
              className="amb-hist-pdf-iframe"
            />
          </div>
        </Modal>
      )}
    </section>
  )
}
