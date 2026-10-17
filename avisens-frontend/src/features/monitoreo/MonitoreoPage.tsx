// MonitoreoPage.tsx — Módulo de Monitoreo Ambiental (EP-04 HU-18 a HU-21).
// Consume /galpones, /lotes, /sensores, /mediciones y /umbrales vía el hook
// compartido useMonitoreoAmbiental. Al seleccionar una tarjeta se abre un
// panel lateral con gauge, estadísticas, histórico real y referencia Italcol.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useMonitoreoAmbiental,
  formatearUltimaLectura,
  tieneLecturaUtil,
  type GalponMonitoreoVista,
  type SensorVista,
  type EstadoSensorVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { semanaDeVida } from '@shared/utils/fechas'
import { SensorDetail } from './SensorDetail'
import AsignarSensores from './AsignarSensores'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcServer } from '@shared/ui/icons/icons'
import '@shared/ui/admin/AdminKit.css'
import './MonitoreoPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function MonitoreoPage() {
  const { galpones, cargando, error, avisoUltimas, recargar } = useMonitoreoAmbiental()
  const [searchParams] = useSearchParams()
  const granjaSolicitada = Number(searchParams.get('granjaId'))

  // La granja primero limita los galpones que aparecen en Monitoreo.
  const [granjaId, setGranjaId] = useState<number | null>(() =>
    Number.isSafeInteger(granjaSolicitada) && granjaSolicitada > 0 ? granjaSolicitada : null,
  )

  // Galpón seleccionado dentro de la granja.
  const [galponId, setGalponId] = useState<number | null>(null)

  // Sensor cuyo panel de detalle está abierto (null = ninguno)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)

  const granjas = useMemo(() => [...new Map<number, string>(
    galpones.map(g => [g.granjaId, g.origen.granja.nombre] as const),
  ).entries()], [galpones])
  useEffect(() => {
    if (granjas.length === 0 || granjas.some(([id]) => id === granjaId)) return
    const solicitadaDisponible = granjas.some(([id]) => id === granjaSolicitada)
    setGranjaId(solicitadaDisponible ? granjaSolicitada : granjas[0][0])
  }, [granjaId, granjaSolicitada, granjas])

  const galponesDeGranja = useMemo(
    () => galpones.filter(g => g.granjaId === granjaId),
    [galpones, granjaId],
  )
  useEffect(() => {
    if (!galponesDeGranja.some(g => g.id === galponId)) {
      setGalponId(galponesDeGranja[0]?.id ?? null)
      setSensorActivo(null)
    }
  }, [galponId, galponesDeGranja])

  const galpon = galponesDeGranja.find(g => g.id === galponId) ?? galponesDeGranja[0] ?? null

  // Conteos de sensores por estado para el encabezado
  const criticos    = galpon?.sensores.filter(s => s.estado === 'critico').length ?? 0
  const advertencia = galpon?.sensores.filter(s => s.estado === 'advertencia').length ?? 0
  const optimos     = galpon?.sensores.filter(s => s.estado === 'optimo').length ?? 0

 function abrirDetalle(sensor: SensorVista) {
    if (!tieneLecturaUtil(sensor.estado)) return
    setSensorActivo(sensor)
  }

  if (cargando && galpones.length === 0) {
    return (
      <div className="page-container mon-page adm-page">
        <p className="mon-cargando">Cargando monitoreo ambiental…</p>
      </div>
    )
  }

  return (
    <div className="page-container mon-page adm-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <CabeceraAdmin
        eyebrow="Condiciones ambientales"
        titulo="Monitoreo ambiental"
        subtitulo="Lecturas en tiempo real. Selecciona un sensor para consultar sus detalles."
        acciones={galpon ? (
          <div className="mon-resumen">
            {criticos    > 0 && <span className="mon-badge mon-badge--critico"><span className="mon-dot mon-dot--critico" /> {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
            {advertencia > 0 && <span className="mon-badge mon-badge--advertencia"><span className="mon-dot mon-dot--advertencia" /> {advertencia} advertencia{advertencia > 1 ? 's' : ''}</span>}
            <span className="mon-badge mon-badge--optimo"><span className="mon-dot mon-dot--optimo" /> {optimos} óptimo{optimos > 1 ? 's' : ''}</span>
          </div>
        ) : undefined}
      />

      {error && <div className="mon-alert adm-alerta" role="alert">{error}</div>}
      {!error && avisoUltimas && <div className="mon-alert adm-aviso" role="status">{avisoUltimas}</div>}

      {galpones.length === 0 ? (
        <p className="mon-cargando">No hay galpones registrados todavía.</p>
      ) : !galpon ? null : (
        <>
          <div className="mon-contexto-selectores">
            <label className="mon-contexto-campo">
              <span>Granja</span>
              <select
                value={granjaId ?? ''}
                onChange={e => { setGranjaId(Number(e.target.value)); setGalponId(null); setSensorActivo(null) }}
              >
                {granjas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
            </label>
          </div>

          {/* ── Selector de galpón ──────────────────────────────────────────── */}
          <div className="mon-selector">
            {galponesDeGranja.map(g => (
              <button
                key={g.id}
                type="button"
                className={`mon-tab${g.id === galpon.id ? ' mon-tab--activo' : ''}`}
                onClick={() => { setGalponId(g.id); setSensorActivo(null) }}
              >
                <span className={`mon-dot mon-dot--${estadoGlobal(g)}`} />
                <span>Código de galpón: {g.codigo}</span>
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

          <AsignarSensores
            key={galpon.id}
            galponId={galpon.id}
            galponCodigo={galpon.codigo}
            galponNombre={galpon.nombre}
            recargar={recargar}
          />

          {/* ── Tarjetas de sensores (clickables) ───────────────────────────── */}
          {galpon.sensores.length === 0 && !galpon.loteActivo ? (
            <div className="mon-offline-msg adm-panel">
              <IcServer size={32} />
              <p>Galpón sin lote activo y sin sensores registrados.</p>
            </div>
          ) : galpon.sensores.length === 0 ? (
            <div className="mon-offline-msg adm-panel">
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
          {galpon.loteActivo && galpon.sensores.length > 0 && (
            <section className="mon-section">
              <h2 className="mon-section-title">Umbrales configurados · Semana {semanaDeVida(galpon.diaVida) + 1}</h2>
              <p className="mon-section-sub">El backend soporta umbral por temperatura, humedad y luminosidad — las demás variables se muestran sin rango.</p>
              <div className="mon-tabla-card adm-panel">
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
            diaVida={galpon.loteActivo ? galpon.diaVida : null}
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
    optimo:               'Óptimo',
    advertencia:          'Advertencia',
    critico:               'Crítico',
    sin_umbral:            'Sin umbral',
    offline:               'Sin señal',
    lectura_no_disponible: 'No disponible',
  }

  return (
    <button
      type="button"
      className={[
        'mon-sensor-card',
        `mon-sensor-card--${sensor.estado}`,
        activo ? 'mon-sensor-card--activo' : '',
        tieneLecturaUtil(sensor.estado) ? 'mon-sensor-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={
        tieneLecturaUtil(sensor.estado)
          ? `Ver detalle de ${sensor.tipo}`
          : sensor.estado === 'lectura_no_disponible' ? 'Sin dato disponible' : 'Sensor sin señal'
      }
      aria-pressed={activo}
      disabled={!tieneLecturaUtil(sensor.estado)}
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

      {tieneLecturaUtil(sensor.estado) && rango > 0 && (
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

      {tieneLecturaUtil(sensor.estado) && (
        <span className="mon-sensor-hint" aria-hidden="true">›</span>
      )}
    </button>
  )
}

// ─── Estado global de un galpón según sus sensores ───────────────────────────
function estadoGlobal(galpon: GalponMonitoreoVista): EstadoSensorVista {
  if (galpon.sensores.length === 0) return 'offline'
  if (galpon.sensores.some(s => s.estado === 'critico'))              return 'critico'
  if (galpon.sensores.some(s => s.estado === 'advertencia'))           return 'advertencia'
  if (galpon.sensores.some(s => s.estado === 'lectura_no_disponible')) return 'lectura_no_disponible'
  return 'optimo'
}

export default MonitoreoPage
