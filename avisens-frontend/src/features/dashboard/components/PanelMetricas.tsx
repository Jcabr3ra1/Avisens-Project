import { useEffect, useState } from 'react'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { useSerieSensor } from '../hooks/useSerieSensor'
import { alturaBarra, etiquetaEstado, rangoUmbral } from '../model/metricas'

function DetalleSensor({ sensor }: { sensor: SensorVista }) {
  const { serie, resumen, cargando } = useSerieSensor(sensor.id)

  return (
    <div className="dash-metrica-detalle">
      <div className="dash-metrica-cabecera">
        <div>
          <h3 className="dash-metrica-titulo">{sensor.tipo}</h3>
          <p className="dash-metrica-umbral">
            {rangoUmbral(sensor.minUmbral, sensor.maxUmbral, sensor.unidad)}
          </p>
        </div>
        <span className={`dash-metrica-badge dash-metrica-badge--${sensor.estado}`}>
          {etiquetaEstado(sensor.estado)}
        </span>
      </div>

      <div className="dash-metrica-cifras">
        <span className="dash-metrica-actual mono">
          {sensor.valor ?? '—'}
          <span className="dash-metrica-unidad">{sensor.unidad}</span>
        </span>
        <dl className="dash-metrica-extremos">
          <div><dt>Mín</dt><dd className="mono">{resumen.minimo ?? '—'}</dd></div>
          <div><dt>Prom</dt><dd className="mono">{resumen.promedio ?? '—'}</dd></div>
          <div><dt>Máx</dt><dd className="mono">{resumen.maximo ?? '—'}</dd></div>
        </dl>
      </div>

      {cargando ? (
        <p className="dash-metrica-vacio" role="status">Cargando lecturas…</p>
      ) : serie.length === 0 ? (
        <p className="dash-metrica-vacio">
          Este sensor no ha reportado en las últimas 24 horas.
        </p>
      ) : (
        <>
          <div className="dash-metrica-grafica" role="img"
            aria-label={`Lecturas de ${sensor.tipo} en las últimas 24 horas`}>
            {serie.map((punto, indice) => (
              <span
                key={`${punto.hora}-${indice}`}
                className="dash-metrica-barra"
                style={{ height: `${alturaBarra(punto.valor, resumen.maximo)}%` }}
                title={`${punto.hora} · ${punto.valor} ${sensor.unidad}`}
              />
            ))}
          </div>
          <div className="dash-metrica-eje">
            <span>{serie[0]?.hora}</span>
            <span>{serie[serie.length - 1]?.hora}</span>
          </div>
        </>
      )}
    </div>
  )
}

function PanelMetricas({ sensores }: { sensores: SensorVista[] }) {
  const [sensorId, setSensorId] = useState<number | null>(sensores[0]?.id ?? null)

  // Al cambiar de galpón los sensores son otros: si no se reinicia, la
  // pestaña activa apunta a un sensor que ya no está en la lista.
  useEffect(() => {
    setSensorId((actual) =>
      actual !== null && sensores.some((s) => s.id === actual) ? actual : sensores[0]?.id ?? null,
    )
  }, [sensores])

  if (sensores.length === 0) {
    return (
      <section className="dash-metricas dash-metricas--vacio">
        <p>Este galpón no tiene sensores registrados.</p>
      </section>
    )
  }

  const activo = sensores.find((sensor) => sensor.id === sensorId) ?? sensores[0]

  return (
    <section className="dash-metricas" aria-label="Lecturas de los sensores del galpón">
      <div className="dash-metricas-tabs" role="tablist" aria-label="Sensores">
        {sensores.map((sensor) => (
          <button
            key={sensor.id}
            type="button"
            role="tab"
            aria-selected={sensor.id === activo.id}
            className={`dash-metrica-tab${sensor.id === activo.id ? ' es-activo' : ''}`}
            onClick={() => setSensorId(sensor.id)}
          >
            <span className="dash-metrica-tab-icono">{iconoSensor(sensor.tipo, 15)}</span>
            <span className="dash-metrica-tab-texto">
              <span className="dash-metrica-tab-tipo">{sensor.tipo}</span>
              <span className="dash-metrica-tab-valor mono">
                {sensor.valor ?? '—'}
                <span className="dash-metrica-tab-unidad">{sensor.unidad}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="dash-metricas-cuerpo" role="tabpanel">
        <DetalleSensor key={activo.id} sensor={activo} />
      </div>
    </section>
  )
}

export default PanelMetricas
