// MonitoreoPage.tsx — Módulo de Monitoreo Ambiental (EP-04 HU-18 a HU-21).
// Consume /galpones, /lotes, /sensores, /mediciones y /umbrales vía el hook
// compartido useMonitoreoAmbiental. Al seleccionar una tarjeta se abre un
// panel lateral con gauge, estadísticas, histórico real y referencia Italcol.

import { useEffect, useRef, useState } from 'react'
import {
  useMonitoreoAmbiental,
  formatearUltimaLectura,
  tieneLecturaUtil,
  estaEncendido,
  textoValor,
  type GalponMonitoreoVista,
  type SensorVista,
  type EstadoSensorVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { semanaDeVida } from '@shared/utils/fechas'
import { SensorDetail } from './SensorDetail'
import { LecturasEnVivo } from './LecturasEnVivo'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcServer } from '@shared/ui/icons/icons'
import '@shared/ui/admin/AdminKit.css'
import './MonitoreoPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function MonitoreoPage() {
  const { galpones, cargando, error, avisoUltimas, recargar } = useMonitoreoAmbiental()

  // Galpón seleccionado en el selector superior
  const [galponId, setGalponId] = useState<number | null>(null)

  // Sensor cuyo panel de detalle está abierto (null = ninguno)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)

  // Las tarjetas se recargan al llegar una lectura nueva, pero como mucho
  // cada 20 s: el ESP32 manda cada 5 s y cada recarga son 5 peticiones, lo
  // que sumado a "Lecturas en vivo" se acercaba al límite del backend.
  const ultimaRecarga = useRef(0)
  function recargarTarjetas() {
    if (Date.now() - ultimaRecarga.current < 20_000) return
    ultimaRecarga.current = Date.now()
    void recargar()
  }

  useEffect(() => {
    if (galponId === null && galpones.length > 0) setGalponId(galpones[0].id)
  }, [galponId, galpones])

  const galpon = galpones.find(g => g.id === galponId) ?? galpones[0] ?? null

  // Conteos de sensores por estado para el encabezado
  const criticos    = galpon?.sensores.filter(s => s.estado === 'critico').length ?? 0
  const advertencia = galpon?.sensores.filter(s => s.estado === 'advertencia').length ?? 0
  const optimos     = galpon?.sensores.filter(s => s.estado === 'optimo').length ?? 0

 function abrirDetalle(sensor: SensorVista) {
    if (!puedeAbrirDetalle(sensor)) return
    setSensorActivo(sensor)
  }

  if (cargando) {
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
          {/* ── Selector de galpón ──────────────────────────────────────────── */}
          <div className="mon-selector">
            {galpones.map(g => (
              <button
                key={g.id}
                type="button"
                className={`mon-tab${g.id === galpon.id ? ' mon-tab--activo' : ''}`}
                onClick={() => { setGalponId(g.id); setSensorActivo(null) }}
              >
                <span className={`mon-dot mon-dot--${estadoGlobal(g)}`} />
                <span>{g.codigo}</span>
                <small>{g.nombre.replace('Galpón ', '')}</small>
              </button>
            ))}
          </div>

          {/* ── Info del galpón ──────────────────────────────────────────────── */}
          {/* Los sensores son del galpón, no del lote: se muestran haya o no
              lote activo. El lote solo da contexto (día de vida, umbrales). */}
          <div className="mon-lote-info">
            <strong>{galpon.nombre}</strong>
            <span>· {galpon.sensores.length} sensor{galpon.sensores.length === 1 ? '' : 'es'}</span>
            {galpon.loteActivo
              ? <span>· Lote {galpon.loteActivo.codigo} · Día <strong>{galpon.diaVida}</strong> de vida</span>
              : <span className="mon-sin-lote">· Sin lote activo</span>}
          </div>

          {/* ── Tarjetas de sensores (clickables) ───────────────────────────── */}
          {galpon.sensores.length === 0 ? (
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

          {/* ── Lecturas en vivo (gráficas + últimas lecturas) ──────────────── */}
          {galpon.sensores.length > 0 && (
            <LecturasEnVivo sensores={galpon.sensores} onNuevaLectura={recargarTarjetas} />
          )}

          {/* ── Tabla de sensores del galpón + umbrales (HU-21) ─────────────── */}
          {galpon.sensores.length > 0 && (
            <section className="mon-section">
              <h2 className="mon-section-title">Sensores del galpón · Umbrales semana {semanaDeVida(galpon.diaVida) + 1}</h2>
              <p className="mon-section-sub">El backend soporta umbral por temperatura, humedad y luminosidad — las demás variables se muestran sin rango.</p>
              <div className="mon-tabla-card adm-panel">
                <div className="mon-tabla-head mon-tabla--sensores">
                  <span>ID</span><span>Sensor</span><span>Estado</span><span>Valor</span><span>Mín.</span><span>Máx.</span><span>Última lectura</span>
                </div>
                {galpon.sensores.map(s => (
                  <div key={s.id + '-u'} className="mon-tabla-row mon-tabla--sensores">
                    <span className="mon-tabla-id">#{s.id}</span>
                    <span className="mon-tabla-sensor">
                      <span>{iconoSensor(s.tipo, 14)} {s.tipo}</span>
                      <small>{s.codigo}</small>
                    </span>
                    <span>
                      <InsigniaEstado sensor={s} />
                    </span>
                    <span>{s.valor === null ? '—' : <strong>{textoValor(s, s.valor)}</strong>}</span>
                    <span>{s.minUmbral ?? '—'}</span>
                    <span>{s.maxUmbral ?? '—'}</span>
                    <span className="mon-tabla-ultima">{formatearUltimaLectura(s.ultimaLecturaTs)}</span>
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

const ETIQUETA_ESTADO: Record<EstadoSensorVista, string> = {
  optimo:                'Óptimo',
  advertencia:           'Advertencia',
  critico:               'Crítico',
  sin_umbral:            'Sin umbral',
  offline:               'Sin señal',
  lectura_no_disponible: 'No disponible',
  obsoleta:              'Desactualizado',
}

// Los motores (sensores de estado) no tienen gauge ni umbrales: el panel de
// detalle no aplica.
function puedeAbrirDetalle(sensor: SensorVista): boolean {
  return tieneLecturaUtil(sensor.estado) && !sensor.esEstado
}

// Insignia de estado. Un motor con lectura vigente dice Encendido/Apagado en
// lugar de "Sin umbral"; si la lectura es vieja o falta, manda el estado.
function InsigniaEstado({ sensor }: { sensor: SensorVista }) {
  const vigente = sensor.esEstado && sensor.valor !== null &&
    (sensor.estado === 'sin_umbral' || sensor.estado === 'optimo')
  if (vigente) {
    const on = estaEncendido(sensor.valor!)
    return (
      <span className={`mon-estado-badge mon-estado-badge--${on ? 'encendido' : 'apagado'}`}>
        {on ? 'Encendido' : 'Apagado'}
      </span>
    )
  }
  return (
    <span className={`mon-estado-badge mon-estado-badge--${sensor.estado}`}>
      {ETIQUETA_ESTADO[sensor.estado]}
    </span>
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

  return (
    <button
      type="button"
      className={[
        'mon-sensor-card',
        `mon-sensor-card--${sensor.estado}`,
        activo ? 'mon-sensor-card--activo' : '',
        puedeAbrirDetalle(sensor) ? 'mon-sensor-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={
        puedeAbrirDetalle(sensor)
          ? `Ver detalle de ${sensor.tipo}`
          : sensor.esEstado && tieneLecturaUtil(sensor.estado) ? `${sensor.tipo}: ${textoValor(sensor, sensor.valor)}`
          : sensor.estado === 'lectura_no_disponible' ? 'Sin dato disponible' : 'Sensor sin señal'
      }
      aria-pressed={activo}
      disabled={!puedeAbrirDetalle(sensor)}
    >
      <div className="mon-sensor-icon">{iconoSensor(sensor.tipo, 22)}</div>

      <div className="mon-sensor-info">
        <span className="mon-sensor-nombre">{sensor.tipo}</span>
        <span className="mon-sensor-zona">ID #{sensor.id} · {sensor.codigo}</span>
      </div>

      <div className="mon-sensor-valor">
        {sensor.estado === 'offline' || sensor.valor === null
          ? <span className="mon-offline-txt">—</span>
          : sensor.esEstado
            ? <strong className={`mon-onoff mon-onoff--${estaEncendido(sensor.valor) ? 'on' : 'off'}`}>{textoValor(sensor, sensor.valor)}</strong>
            : <><strong>{sensor.valor}</strong><small>{sensor.unidad}</small></>
        }
      </div>

      {tieneLecturaUtil(sensor.estado) && rango > 0 && (
        <div className="mon-barra-wrap">
          <div className="mon-barra" style={{ width: `${relativo}%` }} />
        </div>
      )}

      <div className="mon-sensor-footer">
        <InsigniaEstado sensor={sensor} />
        <span className="mon-ultima">{formatearUltimaLectura(sensor.ultimaLecturaTs)}</span>
      </div>

      {puedeAbrirDetalle(sensor) && (
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
  if (galpon.sensores.some(s => s.estado === 'obsoleta'))              return 'obsoleta'
  if (galpon.sensores.some(s => s.estado === 'lectura_no_disponible')) return 'lectura_no_disponible'
  return 'optimo'
}

export default MonitoreoPage
