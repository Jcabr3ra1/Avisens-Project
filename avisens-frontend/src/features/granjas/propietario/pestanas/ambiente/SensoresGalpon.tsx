import { motion } from 'motion/react'
import { etiquetaEstado } from '@features/dashboard/model/metricas'
import PanelMetricas from '@features/dashboard/components/PanelMetricas'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { hace } from '@shared/utils/fechas'
import '@features/dashboard/DashboardPage.css'

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

function SensoresGalpon({ sensores, reportando }: Props) {
  const total = sensores.length

  if (total === 0) {
    return (
      <section className="amb-tarjeta amb-sin-sensores">
        <h3>Este galpón todavía no tiene sensores</h3>
        <p>El pronóstico de calor funciona igual; con sensores el cálculo se ajusta a lo que pasa adentro.</p>
      </section>
    )
  }

  return (
    <section className="amb-sensores" aria-labelledby="amb-sensores-titulo">
      <div className="amb-seccion-cabecera">
        <h3 id="amb-sensores-titulo">Sensores del galpón</h3>
        <span className={`amb-conteo${reportando < total ? ' is-alerta' : ''}`}>
          <span className="amb-conteo-punto" aria-hidden="true" />
          {reportando} de {total} reportando
        </span>
      </div>

      <ul className="amb-sensores-grid">
        {sensores.map((sensor, indice) => {
          const posicion = posicionEnRango(sensor)
          return (
            <motion.li
              key={sensor.id}
              className={`amb-sensor amb-sensor--${sensor.estado}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * indice, duration: 0.25 }}
            >
              <div className="amb-sensor-cabecera">
                <span className="amb-sensor-icono" aria-hidden="true">{iconoSensor(sensor.tipo, 18)}</span>
                <span className="amb-sensor-tipo">{sensor.tipo}</span>
                <span className={`amb-sensor-estado amb-sensor-estado--${sensor.estado}`}>{etiquetaEstado(sensor.estado)}</span>
              </div>
              <span className="amb-sensor-valor">
                {sensor.valor === null ? '—' : decimal.format(sensor.valor)}
                <small>{sensor.unidad}</small>
              </span>
              {posicion !== null ? (
                <div className="amb-sensor-rango">
                  <div className="amb-sensor-pista"><span style={{ left: `${posicion}%` }} /></div>
                  <span>Rango {decimal.format(sensor.minUmbral ?? 0)}–{decimal.format(sensor.maxUmbral ?? 0)} {sensor.unidad}</span>
                </div>
              ) : (
                <span className="amb-sensor-nota">Sin rango configurado</span>
              )}
              <span className="amb-sensor-nota" title={sensor.codigo}>
                {sensor.ultimaLecturaTs === null ? 'Aún no reporta' : `Última lectura ${hace(new Date(sensor.ultimaLecturaTs).toISOString())}`}
              </span>
            </motion.li>
          )
        })}
      </ul>

      <div className="amb-tarjeta amb-historia">
        <div className="amb-seccion-cabecera">
          <h3>Últimas 24 horas</h3>
        </div>
        <div className="gp-metricas">
          <PanelMetricas sensores={sensores} />
        </div>
      </div>
    </section>
  )
}

export default SensoresGalpon
