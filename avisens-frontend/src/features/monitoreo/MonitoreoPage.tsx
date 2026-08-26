// MonitoreoPage.tsx — Módulo de Monitoreo Ambiental (EP-04 HU-18 a HU-21).
// Consume /galpones, /lotes, /sensores, /mediciones y /umbrales vía el hook
// compartido useMonitoreoAmbiental. Al tocar una tarjeta de sensor se abre un
// panel lateral con gauge, estadísticas, histórico real y referencia Italcol.

import { useEffect, useState } from 'react'
import {
  useMonitoreoAmbiental,
  formatearUltimaLectura,
  type GalponMonitoreoVista,
  type SensorVista,
  type EstadoSensorVista,
} from '@shared/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { SensorDetail } from './SensorDetail'
import { IcServer } from '@shared/ui/icons/icons'
import './MonitoreoPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function MonitoreoPage() {
  const { galpones, cargando, error } = useMonitoreoAmbiental()

  // Galpón seleccionado en el selector superior
  const [galponId, setGalponId] = useState<number | null>(null)

  // Sensor cuyo panel de detalle está abierto (null = ninguno)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)

  useEffect(() => {
    if (galponId === null && galpones.length > 0) setGalponId(galpones[0].id)
  }, [galponId, galpones])

  const galpon = galpones.find(g => g.id === galponId) ?? galpones[0] ?? null

  // Conteos de sensores por estado para el encabezado
  const criticos    = galpon?.sensores.filter(s => s.estado === 'critico').length ?? 0
  const advertencia = galpon?.sensores.filter(s => s.estado === 'advertencia').length ?? 0
  const optimos     = galpon?.sensores.filter(s => s.estado === 'optimo').length ?? 0

  function abrirDetalle(sensor: SensorVista) {
    if (sensor.estado === 'offline') return
    setSensorActivo(sensor)
  }

  if (cargando) {
    return (
      <div className="page-container mon-page">
        <p className="mon-cargando">Cargando monitoreo ambiental…</p>
      </div>
    )
  }

  return (
    <div className="page-container mon-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="mon-header">
        <div>
          <h1 className="mon-title">Monitoreo Ambiental</h1>
          <p className="mon-sub">Lecturas en tiempo real · Toca un sensor para más detalles</p>
        </div>

        {galpon && (
          <div className="mon-resumen">
            {criticos    > 0 && <span className="mon-badge mon-badge--critico"><span className="mon-dot mon-dot--critico" /> {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
            {advertencia > 0 && <span className="mon-badge mon-badge--advertencia"><span className="mon-dot mon-dot--advertencia" /> {advertencia} advertencia{advertencia > 1 ? 's' : ''}</span>}
            <span className="mon-badge mon-badge--optimo"><span className="mon-dot mon-dot--optimo" /> {optimos} óptimo{optimos > 1 ? 's' : ''}</span>
          </div>
        )}
      </header>

      {error && <div className="mon-alert" role="alert">{error}</div>}

      {galpones.length === 0 ? (
        <p className="mon-cargando">No hay galpones registrados todavía.</p>
      ) : !galpon ? null : (
        <>
          {/* ── Selector de galpón ──────────────────────────────────────────── */}
          <div className="mon-selector">
            {galpones.map(g => (
              <button
                key={g.id}
                className={`mon-tab${g.id === galpon.id ? ' mon-tab--activo' : ''}`}
                onClick={() => { setGalponId(g.id); setSensorActivo(null) }}
              >
                <span className={`mon-dot mon-dot--${estadoGlobal(g)}`} />
                <span>{g.codigo}</span>
                <small>{g.nombre.replace('Galpón ', '')}</small>
              </button>
            ))}
          </div>

          {/* ── Info del lote activo ─────────────────────────────────────────── */}
          <div className="mon-lote-info">
            <strong>{galpon.nombre}</strong>
            {galpon.loteActivo
              ? <span>· Lote {galpon.loteActivo.codigo} · Día <strong>{galpon.diaVida}</strong> de vida</span>
              : <span className="mon-sin-lote">· Sin lote activo</span>}
          </div>

          {/* ── Tarjetas de sensores (clickables) ───────────────────────────── */}
          {!galpon.loteActivo ? (
            <div className="mon-offline-msg">
              <IcServer size={32} />
              <p>Galpón vacío. Los sensores se activarán cuando ingrese un nuevo lote.</p>
            </div>
          ) : galpon.sensores.length === 0 ? (
            <div className="mon-offline-msg">
              <IcServer size={32} />
              <p>Este galpón todavía no tiene sensores registrados.</p>
            </div>
          ) : (
            <div className="mon-sensores">
              {galpon.sensores.map(s => (
                <TarjetaSensor
                  key={s.id}
                  sensor={s}
                  activo={sensorActivo?.id === s.id}
                  onClick={() => abrirDetalle(s)}
                />
              ))}
            </div>
          )}

          {/* ── Tabla de umbrales configurados (HU-21) ──────────────────────── */}
          {galpon.sensores.length > 0 && (
            <section className="mon-section">
              <h2 className="mon-section-title">Umbrales configurados · Semana {Math.floor(galpon.diaVida / 7) + 1}</h2>
              <p className="mon-section-sub">El backend soporta umbral por temperatura, humedad y luminosidad — las demás variables se muestran sin rango.</p>
              <div className="mon-tabla-card">
                <div className="mon-tabla-head">
                  <span>Variable</span><span>Mín.</span><span>Máx.</span><span>Unidad</span>
                </div>
                {galpon.sensores.map(s => (
                  <div key={s.id + '-u'} className="mon-tabla-row">
                    <span>{iconoSensor(s.tipo, 14)} {s.tipo}</span>
                    <span>{s.minUmbral ?? '—'}</span>
                    <span>{s.maxUmbral ?? '—'}</span>
                    <span>{s.unidad}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Panel lateral de detalle del sensor ─────────────────────────── */}
          <SensorDetail
            sensor={sensorActivo}
            galponNombre={galpon.nombre}
            diaVida={galpon.diaVida}
            onClose={() => setSensorActivo(null)}
          />
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: tarjeta de sensor ────────────────────────────────────────
type TarjetaProps = {
  sensor:  SensorVista
  activo:  boolean
  onClick: () => void
}
function TarjetaSensor({ sensor, activo, onClick }: TarjetaProps) {
  const rango   = sensor.minUmbral !== null && sensor.maxUmbral !== null ? sensor.maxUmbral - sensor.minUmbral : 0
  const relativo = rango > 0 && sensor.valor !== null
    ? Math.min(100, Math.max(0, ((sensor.valor - (sensor.minUmbral ?? 0)) / rango) * 100))
    : 50

  const etiquetaEstado: Record<EstadoSensorVista, string> = {
    optimo:      'Óptimo',
    advertencia: 'Advertencia',
    critico:     'Crítico',
    sin_umbral:  'Sin umbral',
    offline:     'Sin señal',
  }

  return (
    <button
      className={[
        'mon-sensor-card',
        `mon-sensor-card--${sensor.estado}`,
        activo ? 'mon-sensor-card--activo' : '',
        sensor.estado !== 'offline' ? 'mon-sensor-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={sensor.estado !== 'offline' ? `Ver detalle de ${sensor.tipo}` : 'Sensor sin señal'}
      aria-pressed={activo}
      disabled={sensor.estado === 'offline'}
    >
      <div className="mon-sensor-icon">{iconoSensor(sensor.tipo, 22)}</div>

      <div className="mon-sensor-info">
        <span className="mon-sensor-nombre">{sensor.tipo}</span>
        <span className="mon-sensor-zona">{sensor.codigo}</span>
      </div>

      <div className="mon-sensor-valor">
        {sensor.estado === 'offline' || sensor.valor === null
          ? <span className="mon-offline-txt">—</span>
          : <><strong>{sensor.valor}</strong><small>{sensor.unidad}</small></>
        }
      </div>

      {sensor.estado !== 'offline' && rango > 0 && (
        <div className="mon-barra-wrap">
          <div className="mon-barra" style={{ width: `${relativo}%` }} />
        </div>
      )}

      <div className="mon-sensor-footer">
        <span className={`mon-estado-badge mon-estado-badge--${sensor.estado}`}>
          {etiquetaEstado[sensor.estado]}
        </span>
        <span className="mon-ultima">{formatearUltimaLectura(sensor.ultimaLecturaTs)}</span>
      </div>

      {sensor.estado !== 'offline' && (
        <span className="mon-sensor-hint" aria-hidden="true">›</span>
      )}
    </button>
  )
}

// ─── Estado global de un galpón según sus sensores ───────────────────────────
function estadoGlobal(galpon: GalponMonitoreoVista): EstadoSensorVista {
  if (!galpon.loteActivo || galpon.sensores.length === 0) return 'offline'
  if (galpon.sensores.some(s => s.estado === 'critico'))    return 'critico'
  if (galpon.sensores.some(s => s.estado === 'advertencia')) return 'advertencia'
  return 'optimo'
}

export default MonitoreoPage
