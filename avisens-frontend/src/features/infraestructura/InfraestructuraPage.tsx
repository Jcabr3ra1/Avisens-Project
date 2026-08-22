// InfraestructuraPage.tsx — Módulo de Infraestructura (EP-08 HU-34 a HU-37).
// Muestra galpones y el estado físico de sus sensores/dispositivos IoT.
// Consume /granjas, /galpones, /sensores y /dispositivos. El backend no modela
// "zonas" dentro de un galpón ni equipos físicos (extractor, bebedero,
// comedero...) con ciclos de mantenimiento — solo sensores y dispositivos ESP32
// con sus fechas de calibración, así que esta pantalla se recortó a eso.

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { isAxiosError } from 'axios'
import {
  listarGranjas,
  listarGalpones,
  listarSensores,
  listarDispositivos,
  type Granja,
  type Galpon,
  type Sensor,
  type Dispositivo,
} from '@shared/api'
import {
  IcPin, IcBox, IcSettings, IcServer,
  IcThermo, IcDrop, IcCloud, IcWind, IcSun,
} from '@shared/ui/icons/icons'
import './InfraestructuraPage.css'

// Ícono aproximado según el texto libre de `sensor.tipo` (el backend no lo
// restringe a un enum, así que se infiere por coincidencia de texto).
function iconoTipoSensor(tipo: string): ReactNode {
  const t = tipo.toLowerCase()
  if (t.includes('temp'))            return <IcThermo size={13} />
  if (t.includes('hum'))             return <IcDrop   size={13} />
  if (t.includes('co2') || t.includes('gas')) return <IcCloud size={13} />
  if (t.includes('nh3') || t.includes('amon')) return <IcWind size={13} />
  if (t.includes('luz') || t.includes('lum'))  return <IcSun  size={13} />
  return <IcSettings size={13} />
}

// % de vida útil de calibración transcurrida entre última y próxima calibración
function vidaUtilPct(sensor: Sensor): number | null {
  if (!sensor.ultima_calibracion || !sensor.proxima_calibracion) return null
  const inicio = new Date(sensor.ultima_calibracion).getTime()
  const fin    = new Date(sensor.proxima_calibracion).getTime()
  if (fin <= inicio) return null
  const pct = ((Date.now() - inicio) / (fin - inicio)) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

// ─── Componente principal ─────────────────────────────────────────────────────
function InfraestructuraPage() {
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Galpón seleccionado para ver sus sensores/dispositivos
  const [galponId, setGalponId] = useState<number | null>(null)

  // Pestaña: 'galpones' o 'equipos'
  const [tab, setTab] = useState<'galpones' | 'equipos'>('galpones')

  useEffect(() => {
    let activo = true

    async function cargar() {
      try {
        const [granjasData, galponesData, sensoresData, dispositivosData] = await Promise.all([
          listarGranjas(),
          listarGalpones(),
          listarSensores(),
          listarDispositivos(),
        ])
        if (!activo) return
        setGranjas(granjasData)
        setGalpones(galponesData)
        setSensores(sensoresData)
        setDispositivos(dispositivosData)
        setGalponId((actual) => actual ?? galponesData[0]?.id ?? null)
        setError('')
      } catch (err) {
        if (!activo) return
        setError(
          isAxiosError(err) && err.response?.status === 403
            ? 'No tienes permisos para ver infraestructura.'
            : 'No se pudo cargar la infraestructura.',
        )
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [])

  const sensoresGalpon = sensores.filter(s => s.galpon.id === galponId)
  const dispositivosGalpon = dispositivos.filter(d => d.galpon.id === galponId)

  // Contadores para alertas de mantenimiento
  const inactivos  = sensores.filter(s => s.estado === 'inactivo').length
  const proximoMto = sensores.filter(s => (vidaUtilPct(s) ?? 0) >= 95).length

  if (cargando) {
    return (
      <div className="page-container inf-page">
        <p className="inf-vacio">Cargando infraestructura…</p>
      </div>
    )
  }

  return (
    <div className="page-container inf-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="inf-header">
        <div>
          <h1 className="inf-title">Infraestructura</h1>
          <p className="inf-sub">Galpones, sensores y dispositivos IoT</p>
        </div>

        {/* Alertas de equipos */}
        <div className="inf-alertas">
          {inactivos > 0   && <span className="inf-alerta inf-alerta--falla"><span className="inf-dot inf-dot--falla" /> {inactivos} inactivo{inactivos > 1 ? 's' : ''}</span>}
          {proximoMto > 0  && <span className="inf-alerta inf-alerta--mto"><span className="inf-dot inf-dot--mto" /> {proximoMto} próximo mto.</span>}
        </div>
      </header>

      {error && <div className="inf-alert-error" role="alert">{error}</div>}

      {/* ── Pestañas ────────────────────────────────────────────────────────── */}
      <div className="inf-tabs">
        <button className={`inf-tab${tab === 'galpones' ? ' inf-tab--activo' : ''}`} onClick={() => setTab('galpones')}>
          <IcBox size={14} /> Galpones
        </button>
        <button className={`inf-tab${tab === 'equipos' ? ' inf-tab--activo' : ''}`} onClick={() => setTab('equipos')}>
          <IcSettings size={14} /> Sensores y dispositivos
        </button>
      </div>

      {/* ── Pestaña: Galpones (HU-34) ────────────────────────────────────────── */}
      {tab === 'galpones' && (
        galpones.length === 0 ? (
          <p className="inf-vacio">No hay galpones registrados todavía.</p>
        ) : (
          <div className="inf-galpones">
            {galpones.map(g => {
              const granja = granjas.find(gr => gr.id === g.granja.id)
              const areaM2 = g.ancho_metros && g.largo_metros ? g.ancho_metros * g.largo_metros : null
              return (
                <div key={g.id} className="inf-galpon-card">
                  <div className="inf-galpon-head">
                    <span className="inf-galpon-codigo">{g.codigo}</span>
                    <span className="inf-galpon-nombre">{g.nombre}</span>
                    {areaM2 && <span className="inf-galpon-area">{areaM2.toLocaleString()} m²</span>}
                    {g.capacidad_aves && <span className="inf-galpon-cap">{g.capacidad_aves.toLocaleString()} aves</span>}
                  </div>

                  {/* Características físicas reales del galpón */}
                  <div className="inf-zonas">
                    {g.orientacion && <span className="inf-zona-badge">Orientación {g.orientacion}</span>}
                    {g.tipo_techo && <span className="inf-zona-badge">Techo {g.tipo_techo}</span>}
                    {!g.activo && <span className="inf-zona-badge">Inactivo</span>}
                  </div>

                  {granja && (
                    <p className="inf-ubicacion">
                      <IcPin size={13} /> {granja.nombre} · {granja.municipio ?? '—'}, {granja.departamento ?? '—'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Pestaña: Sensores y dispositivos (HU-35, HU-36, HU-37) ──────────── */}
      {tab === 'equipos' && (
        <>
          {/* Selector de galpón para filtrar */}
          <div className="inf-selector">
            {galpones.map(g => (
              <button
                key={g.id}
                className={`inf-selector-btn${g.id === galponId ? ' inf-selector-btn--activo' : ''}`}
                onClick={() => setGalponId(g.id)}
              >
                {g.codigo}
              </button>
            ))}
          </div>

          <div className="inf-tabla-card">
            <table className="inf-tabla">
              <thead>
                <tr>
                  <th>Código</th><th>Tipo</th><th>Modelo</th>
                  <th>Vida útil calibración</th><th>Próx. calibración</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sensoresGalpon.map(s => (
                  <FilaSensor key={s.id} sensor={s} />
                ))}
                {dispositivosGalpon.map(d => (
                  <FilaDispositivo key={`disp-${d.id}`} dispositivo={d} />
                ))}
                {sensoresGalpon.length === 0 && dispositivosGalpon.length === 0 && (
                  <tr>
                    <td colSpan={6} className="inf-vacio">Este galpón no tiene sensores ni dispositivos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: fila de sensor ──────────────────────────────────────────
function FilaSensor({ sensor }: { sensor: Sensor }) {
  const pct = vidaUtilPct(sensor)
  const colorVida = pct === null ? 'ok' : pct >= 95 ? 'critico' : pct >= 75 ? 'advertencia' : 'ok'

  return (
    <tr className={`inf-fila inf-fila--${sensor.estado}`}>
      <td><code className="inf-codigo">{sensor.codigo}</code></td>
      <td className="inf-tipo"><span className="inf-tipo-icon">{iconoTipoSensor(sensor.tipo)}</span> {sensor.tipo}</td>
      <td>{sensor.modelo ?? '—'}{sensor.fabricante && <><br /><small className="inf-obs">{sensor.fabricante}</small></>}</td>
      <td>
        {pct === null ? '—' : (
          <>
            <div className="inf-vida-wrap">
              <div className={`inf-vida-barra inf-vida-barra--${colorVida}`} style={{ width: `${pct}%` }} />
            </div>
            <small>{pct}%</small>
          </>
        )}
      </td>
      <td>{sensor.proxima_calibracion ?? '—'}</td>
      <td>
        <span className={`inf-estado-badge inf-estado-badge--${sensor.estado}`}>
          {sensor.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
    </tr>
  )
}

// ─── Sub-componente: fila de dispositivo (nodo ESP32) ────────────────────────
function FilaDispositivo({ dispositivo }: { dispositivo: Dispositivo }) {
  return (
    <tr className={`inf-fila inf-fila--${dispositivo.activo ? 'activo' : 'inactivo'}`}>
      <td><code className="inf-codigo">{dispositivo.codigo_topic}</code></td>
      <td className="inf-tipo"><span className="inf-tipo-icon"><IcServer size={13} /></span> Dispositivo</td>
      <td>{dispositivo.nombre}<br /><small className="inf-obs">{dispositivo.mac_address}</small></td>
      <td>—</td>
      <td>{dispositivo.version_firmware ?? '—'}</td>
      <td>
        <span className={`inf-estado-badge inf-estado-badge--${dispositivo.activo ? 'activo' : 'inactivo'}`}>
          {dispositivo.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
    </tr>
  )
}

export default InfraestructuraPage
