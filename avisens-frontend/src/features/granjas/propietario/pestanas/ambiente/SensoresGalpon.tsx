import { lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useSerieSensor } from '@features/dashboard/hooks/useSerieSensor'
import { etiquetaEstado, rangoUmbral } from '@features/dashboard/model/metricas'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { hace } from '@shared/utils/fechas'

const GraficoSerie = lazy(() => import('@shared/ui/graficos/GraficoSerie'))

type Props = {
  sensores: SensorVista[]
  reportando: number
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function posicionEnRango(sensor: SensorVista): number | null {
  if (sensor.valor === null || sensor.minUmbral === null || sensor.maxUmbral === null) return null
  const margen = (sensor.maxUmbral - sensor.minUmbral) * 0.5
  const desde = sensor.minUmbral - margen
  const hasta = sensor.maxUmbral + margen
  return Math.min(100, Math.max(0, ((sensor.valor - desde) / (hasta - desde)) * 100))
}

function HistoricoSensor({ sensor }: { sensor: SensorVista }) {
  const { serie, resumen, cargando } = useSerieSensor(sensor.id)

  return (
    <div className="amb-tarjeta amb-historia" role="tabpanel" aria-labelledby={`amb-sensor-tab-${sensor.id}`}>
      <div className="amb-seccion-cabecera amb-historia-cabecera">
        <div>
          <span className="amb-rotulo amb-rotulo--suave">Histórico · Últimas 24 horas</span>
          <h3 className="amb-historia-titulo">{sensor.tipo}</h3>
          <p>
            {rangoUmbral(sensor.minUmbral, sensor.maxUmbral, sensor.unidad)}
            {sensor.codigo ? ` · ${sensor.codigo}` : ''}
          </p>
        </div>

        <dl className="amb-historia-extremos" aria-label="Resumen de las últimas 24 horas">
          <div>
            <dt>Mín</dt>
            <dd>
              {resumen.minimo === null ? '—' : decimal.format(resumen.minimo)}
              {resumen.minimo !== null && sensor.unidad && <small> {sensor.unidad}</small>}
            </dd>
          </div>
          <div>
            <dt>Prom</dt>
            <dd>
              {resumen.promedio === null ? '—' : decimal.format(resumen.promedio)}
              {resumen.promedio !== null && sensor.unidad && <small> {sensor.unidad}</small>}
            </dd>
          </div>
          <div>
            <dt>Máx</dt>
            <dd>
              {resumen.maximo === null ? '—' : decimal.format(resumen.maximo)}
              {resumen.maximo !== null && sensor.unidad && <small> {sensor.unidad}</small>}
            </dd>
          </div>
        </dl>
      </div>

      {cargando ? (
        <p className="amb-historia-vacio" role="status">Cargando lecturas de las últimas 24 horas…</p>
      ) : serie.length === 0 ? (
        <p className="amb-historia-vacio">
          Este sensor no ha reportado lecturas en las últimas 24 horas.
        </p>
      ) : (
        <Suspense fallback={<p className="amb-historia-vacio" role="status">Cargando gráfico…</p>}>
          <GraficoSerie
            puntos={serie.map((punto) => ({ etiqueta: punto.hora, valor: punto.valor }))}
            unidad={sensor.unidad}
            minimo={sensor.minUmbral}
            maximo={sensor.maxUmbral}
            descripcion={`Lecturas de ${sensor.tipo} en las últimas 24 horas, entre ${resumen.minimo ?? '—'} y ${resumen.maximo ?? '—'} ${sensor.unidad}`}
          />
        </Suspense>
      )}
    </div>
  )
}

function SensoresGalpon({ sensores, reportando }: Props) {
  const total = sensores.length
  const [sensorId, setSensorId] = useState<number | null>(sensores[0]?.id ?? null)

  useEffect(() => {
    setSensorId((actual) =>
      actual !== null && sensores.some((s) => s.id === actual) ? actual : sensores[0]?.id ?? null,
    )
  }, [sensores])

  if (total === 0) {
    return (
      <section className="amb-tarjeta amb-sin-sensores">
        <h3>Este galpón todavía no tiene sensores</h3>
        <p>El pronóstico de calor funciona igual; con sensores el cálculo se ajusta a lo que pasa adentro.</p>
      </section>
    )
  }

  const activo = sensores.find((sensor) => sensor.id === sensorId) ?? sensores[0]

  return (
    <section className="amb-sensores" aria-labelledby="amb-sensores-titulo">
      <div className="amb-tarjeta">
        <div className="amb-seccion-cabecera">
          <div>
            <span className="amb-rotulo amb-rotulo--suave">Lecturas en vivo</span>
            <h3 id="amb-sensores-titulo">Sensores del galpón</h3>
            <p>Selecciona un sensor para consultar su tendencia de las últimas 24 horas.</p>
          </div>
          <span className={`amb-conteo${reportando < total ? ' is-alerta' : ''}`}>
            <span className="amb-conteo-punto" aria-hidden="true" />
            {reportando} de {total} reportando
          </span>
        </div>

        <div className="amb-sensores-grid" role="tablist" aria-label="Sensores del galpón">
          {sensores.map((sensor, indice) => {
            const posicion = posicionEnRango(sensor)
            const seleccionado = sensor.id === activo.id
            return (
              <motion.button
                key={sensor.id}
                id={`amb-sensor-tab-${sensor.id}`}
                type="button"
                role="tab"
                aria-selected={seleccionado}
                className={`amb-sensor amb-sensor--${sensor.estado}${seleccionado ? ' is-activo' : ''}`}
                onClick={() => setSensorId(sensor.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * indice, duration: 0.2 }}
              >
                <div className="amb-sensor-cabecera">
                  <span className="amb-sensor-icono" aria-hidden="true">{iconoSensor(sensor.tipo, 17)}</span>
                  <span className="amb-sensor-tipo">{sensor.tipo}</span>
                  <span className={`amb-sensor-estado amb-sensor-estado--${sensor.estado}`}>{etiquetaEstado(sensor.estado)}</span>
                </div>

                <div className="amb-sensor-valor-fila">
                  <span className="amb-sensor-valor">
                    {sensor.valor === null ? '—' : decimal.format(sensor.valor)}
                    <small>{sensor.unidad}</small>
                  </span>
                  {sensor.sinCalibrar && sensor.valor !== null && (
                    <span
                      className="amb-sensor-estado amb-sensor-estado--advertencia"
                      title="El ESP32 envió esta lectura sin calibración: el número no es una medida física confirmada."
                    >
                      Sin calibrar
                    </span>
                  )}
                </div>

                {posicion !== null ? (
                  <div className="amb-sensor-rango">
                    <div className="amb-sensor-pista"><span style={{ left: `${posicion}%` }} /></div>
                    <span>Rango {decimal.format(sensor.minUmbral ?? 0)}–{decimal.format(sensor.maxUmbral ?? 0)} {sensor.unidad}</span>
                  </div>
                ) : (
                  <span className="amb-sensor-nota">Sin rango configurado</span>
                )}

                <div className="amb-sensor-pie">
                  <span className="amb-sensor-nota" title={sensor.codigo}>
                    {sensor.ultimaLecturaTs === null ? 'Aún no reporta' : `Última lectura ${hace(new Date(sensor.ultimaLecturaTs).toISOString())}`}
                  </span>
                  {seleccionado && <span className="amb-sensor-foco">En gráfico</span>}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      <HistoricoSensor key={activo.id} sensor={activo} />
    </section>
  )
}

export default SensoresGalpon
