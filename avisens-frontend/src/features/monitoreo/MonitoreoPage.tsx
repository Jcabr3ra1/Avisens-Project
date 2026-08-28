// MonitoreoPage.tsx — Módulo de Monitoreo Ambiental (EP-04 HU-18 a HU-21).
// Al tocar una tarjeta de sensor se abre un panel lateral con:
//   · Gauge circular SVG del valor actual vs. rango
//   · Estadísticas (mín, máx, promedio)
//   · Histórico de lecturas con spark line
//   · Referencia del Manual Italcol

import { useState } from 'react'
import {
  GALPONES_MONITOREO,
  ICONOS_VARIABLE,
  type GalponMonitoreo,
  type Sensor,
  type EstadoSensor,
} from './data'
import { SensorDetail } from './SensorDetail'
import { IcServer } from '@shared/ui/icons/icons'
import { useLecturasVivas } from '@shared/hooks/useLecturasVivas'
import { calcularEstadoSensor, formatearHace } from '@shared/utils/sensores'
import './MonitoreoPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function MonitoreoPage() {
  // Galpón seleccionado en el selector superior
  const [galponId, setGalponId] = useState<number>(1)

  // Sensor cuyo panel de detalle está abierto (null = ninguno)
  const [sensorActivo, setSensorActivo] = useState<Sensor | null>(null)

  // Galpón activo (datos de configuración: umbrales, día de vida, zonas — mock)
  const galponMock = GALPONES_MONITOREO.find(g => g.id === galponId)!

  // Lecturas reales del ESP32 para este galpón, si ya hay uno conectado.
  // Mientras no exista ninguna lectura en Firebase para este código de galpón,
  // `lecturasVivas` queda vacío y el galpón se muestra igual que siempre (mock).
  const lecturasVivas = useLecturasVivas(galponMock.codigo)

  const galpon: GalponMonitoreo = {
    ...galponMock,
    sensores: galponMock.sensores.map(s => {
      const vivo = lecturasVivas[s.variable]
      if (!vivo || s.estado === 'offline') return s
      // Se redondea a 1 decimal: sensores como el DHT22 devuelven valores con
      // imprecisión de punto flotante (27.60000038) que no aporta nada al
      // productor y no coincide con el formato del resto del sistema.
      const valorRedondeado = Math.round(vivo.valor * 10) / 10
      return {
        ...s,
        valor: valorRedondeado,
        estado: calcularEstadoSensor(valorRedondeado, s.minUmbral, s.maxUmbral),
        ultimaLectura: formatearHace(vivo.ts),
      }
    }),
  }

  // Conteos de sensores por estado para el encabezado
  const criticos    = galpon.sensores.filter(s => s.estado === 'critico').length
  const advertencia = galpon.sensores.filter(s => s.estado === 'advertencia').length
  const optimos     = galpon.sensores.filter(s => s.estado === 'optimo').length

  // Abre el panel de detalle al tocar una tarjeta
  function abrirDetalle(sensor: Sensor) {
    // No abrir panel para sensores offline
    if (sensor.estado === 'offline') return
    setSensorActivo(sensor)
  }

  return (
    <div className="page-container mon-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="mon-header">
        <div>
          <h1 className="mon-title">Monitoreo Ambiental</h1>
          <p className="mon-sub">Lecturas en tiempo real · Actualización cada 60 s · Toca un sensor para más detalles</p>
        </div>

        {/* Contadores de estado del galpón activo */}
        <div className="mon-resumen">
          {criticos    > 0 && <span className="mon-badge mon-badge--critico"><span className="mon-dot mon-dot--critico" /> {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
          {advertencia > 0 && <span className="mon-badge mon-badge--advertencia"><span className="mon-dot mon-dot--advertencia" /> {advertencia} advertencia{advertencia > 1 ? 's' : ''}</span>}
          <span className="mon-badge mon-badge--optimo"><span className="mon-dot mon-dot--optimo" /> {optimos} óptimo{optimos > 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* ── Selector de galpón ──────────────────────────────────────────────── */}
      <div className="mon-selector">
        {GALPONES_MONITOREO.map(g => (
          <button
            key={g.id}
            className={`mon-tab${g.id === galponId ? ' mon-tab--activo' : ''}`}
            onClick={() => { setGalponId(g.id); setSensorActivo(null) }}
          >
            <span className={`mon-dot mon-dot--${estadoGlobal(g)}`} />
            <span>{g.codigo}</span>
            <small>{g.nombre.replace('Galpón ', '')}</small>
          </button>
        ))}
      </div>

      {/* ── Info del lote activo ─────────────────────────────────────────────── */}
      <div className="mon-lote-info">
        <strong>{galpon.nombre}</strong>
        {galpon.diaVida > 0
          ? <span>· Lote activo · Día <strong>{galpon.diaVida}</strong> de vida</span>
          : <span className="mon-sin-lote">· Sin lote activo</span>}
      </div>

      {/* ── Tarjetas de sensores (clickables) ───────────────────────────────── */}
      {galpon.diaVida === 0
        ? (
          <div className="mon-offline-msg">
            <IcServer size={32} />
            <p>Galpón vacío. Los sensores se activarán cuando ingrese un nuevo lote.</p>
          </div>
        )
        : (
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
        )
      }

      {/* ── Tabla de umbrales configurados (HU-21) ──────────────────────────── */}
      <section className="mon-section">
        <h2 className="mon-section-title">Umbrales configurados · Semana {Math.ceil(galpon.diaVida / 7) || 1}</h2>
        <p className="mon-section-sub">Según Manual Italcol para pollos de engorde Ross 308.</p>
        <div className="mon-tabla-card">
          <div className="mon-tabla-head">
            <span>Variable</span><span>Mín.</span><span>Máx.</span><span>Unidad</span>
          </div>
          {galpon.sensores.map(s => (
            <div key={s.id + '-u'} className="mon-tabla-row">
              <span>{ICONOS_VARIABLE[s.variable]} {s.etiqueta}</span>
              <span>{s.variable === 'co2' || s.variable === 'nh3' ? '—' : s.minUmbral}</span>
              <span>{s.maxUmbral}</span>
              <span>{s.unidad}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Panel lateral de detalle del sensor ─────────────────────────────── */}
      {/* Se abre al tocar una tarjeta; muestra gauge, stats, histórico e Italcol */}
      <SensorDetail
        sensor={sensorActivo}
        galpon={galpon.nombre}
        diaVida={galpon.diaVida}
        onClose={() => setSensorActivo(null)}
      />
    </div>
  )
}

// ─── Sub-componente: tarjeta de sensor ────────────────────────────────────────
type TarjetaProps = {
  sensor:  Sensor
  activo:  boolean    // Si el panel de este sensor está abierto
  onClick: () => void
}
function TarjetaSensor({ sensor, activo, onClick }: TarjetaProps) {
  // Porcentaje del valor dentro del rango para la barra interna
  const rango   = sensor.maxUmbral - sensor.minUmbral
  const relativo = rango > 0
    ? Math.min(100, Math.max(0, ((sensor.valor - sensor.minUmbral) / rango) * 100))
    : 50

  const etiquetaEstado: Record<EstadoSensor, string> = {
    optimo:      'Óptimo',
    advertencia: 'Advertencia',
    critico:     'Crítico',
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
      // Indicación de que se puede interactuar (accesibilidad)
      title={sensor.estado !== 'offline' ? `Ver detalle de ${sensor.etiqueta}` : 'Sensor sin señal'}
      aria-pressed={activo}
      disabled={sensor.estado === 'offline'}
    >
      {/* Ícono de la variable */}
      <div className="mon-sensor-icon">{ICONOS_VARIABLE[sensor.variable]}</div>

      {/* Nombre y zona */}
      <div className="mon-sensor-info">
        <span className="mon-sensor-nombre">{sensor.etiqueta}</span>
        <span className="mon-sensor-zona">{sensor.zona}</span>
      </div>

      {/* Valor actual */}
      <div className="mon-sensor-valor">
        {sensor.estado === 'offline'
          ? <span className="mon-offline-txt">—</span>
          : <><strong>{sensor.valor}</strong><small>{sensor.unidad}</small></>
        }
      </div>

      {/* Barra de progreso dentro del rango */}
      {sensor.estado !== 'offline' && (
        <div className="mon-barra-wrap">
          <div className="mon-barra" style={{ width: `${relativo}%` }} />
        </div>
      )}

      {/* Footer: estado + hora + hint de "toca para más" */}
      <div className="mon-sensor-footer">
        <span className={`mon-estado-badge mon-estado-badge--${sensor.estado}`}>
          {etiquetaEstado[sensor.estado]}
        </span>
        <span className="mon-ultima">{sensor.ultimaLectura}</span>
      </div>

      {/* Hint visual de interactividad (flecha) */}
      {sensor.estado !== 'offline' && (
        <span className="mon-sensor-hint" aria-hidden="true">›</span>
      )}
    </button>
  )
}

// ─── Estado global de un galpón según sus sensores ───────────────────────────
function estadoGlobal(galpon: GalponMonitoreo): EstadoSensor {
  if (galpon.diaVida === 0) return 'offline'
  if (galpon.sensores.some(s => s.estado === 'critico'))    return 'critico'
  if (galpon.sensores.some(s => s.estado === 'advertencia')) return 'advertencia'
  return 'optimo'
}

export default MonitoreoPage
