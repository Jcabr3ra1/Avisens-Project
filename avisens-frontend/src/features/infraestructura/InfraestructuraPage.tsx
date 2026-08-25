// InfraestructuraPage.tsx — Módulo de Infraestructura (EP-08 HU-34 a HU-37).
// Muestra galpones con sus zonas, tabla de equipos/sensores y estado de mantenimiento.

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  GALPONES_INFRA,
  EQUIPOS_MOCK,
  type Equipo,
  type EstadoEquipo,
} from './data'
import {
  IcPin, IcBox, IcSettings,
  IcThermo, IcDrop, IcCloud, IcWind, IcFan, IcSeed, IcSun,
} from '@shared/ui/icons/icons'
import './InfraestructuraPage.css'

// Ícono + etiqueta legible por tipo de equipo
const TIPO_INFO: Record<Equipo['tipo'], { icon: ReactNode; label: string }> = {
  sensor_temp: { icon: <IcThermo size={13} />, label: 'Temp.' },
  sensor_hum:  { icon: <IcDrop   size={13} />, label: 'Hum.' },
  sensor_co2:  { icon: <IcCloud  size={13} />, label: 'CO₂' },
  sensor_nh3:  { icon: <IcWind   size={13} />, label: 'NH₃' },
  extractor:   { icon: <IcFan    size={13} />, label: 'Extractor' },
  bebedero:    { icon: <IcDrop   size={13} />, label: 'Bebedero' },
  comedero:    { icon: <IcSeed   size={13} />, label: 'Comedero' },
  lampara:     { icon: <IcSun    size={13} />, label: 'Lámpara' },
  nebulizador: { icon: <IcCloud  size={13} />, label: 'Nebulizador' },
}

// ─── Componente principal ─────────────────────────────────────────────────────
function InfraestructuraPage() {
  // Galpón seleccionado para ver sus equipos
  const [galponId, setGalponId] = useState<number>(1)

  // Pestaña: 'galpones' o 'equipos'
  const [tab, setTab] = useState<'galpones' | 'equipos'>('galpones')

  // Galpón activo
  const galpon = GALPONES_INFRA.find(g => g.id === galponId)!

  // Equipos del galpón seleccionado
  const equiposGalpon = EQUIPOS_MOCK.filter(e => e.galpon === galpon.codigo)

  // Contadores para alertas de mantenimiento
  const enFalla    = EQUIPOS_MOCK.filter(e => e.estado === 'falla').length
  const proximoMto = EQUIPOS_MOCK.filter(e => e.vidaUtilPct >= 95).length

  return (
    <div className="page-container inf-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="inf-header">
        <div>
          <h1 className="inf-title">Infraestructura</h1>
          <p className="inf-sub">Galpones, zonas, sensores y mantenimiento de equipos</p>
        </div>

        {/* Alertas de equipos */}
        <div className="inf-alertas">
          {enFalla > 0    && <span className="inf-alerta inf-alerta--falla"><span className="inf-dot inf-dot--falla" /> {enFalla} en falla</span>}
          {proximoMto > 0 && <span className="inf-alerta inf-alerta--mto"><span className="inf-dot inf-dot--mto" /> {proximoMto} próximo mto.</span>}
        </div>
      </header>

      {/* ── Pestañas ────────────────────────────────────────────────────────── */}
      <div className="inf-tabs">
        <button className={`inf-tab${tab === 'galpones' ? ' inf-tab--activo' : ''}`} onClick={() => setTab('galpones')}>
          <IcBox size={14} /> Galpones y zonas
        </button>
        <button className={`inf-tab${tab === 'equipos' ? ' inf-tab--activo' : ''}`} onClick={() => setTab('equipos')}>
          <IcSettings size={14} /> Equipos y sensores
        </button>
      </div>

      {/* ── Pestaña: Galpones (HU-34) ────────────────────────────────────────── */}
      {tab === 'galpones' && (
        <div className="inf-galpones">
          {GALPONES_INFRA.map(g => (
            <div key={g.id} className="inf-galpon-card">
              {/* Cabecera del galpón */}
              <div className="inf-galpon-head">
                <span className="inf-galpon-codigo">{g.codigo}</span>
                <span className="inf-galpon-nombre">{g.nombre}</span>
                <span className="inf-galpon-area">{g.areaM2.toLocaleString()} m²</span>
                <span className="inf-galpon-cap">{g.capacidadAves.toLocaleString()} aves</span>
              </div>

              {/* Zonas del galpón */}
              <div className="inf-zonas">
                {g.zonas.map(z => (
                  <span key={z.codigo} className="inf-zona-badge">
                    {z.nombre} · {z.areaM2} m²
                  </span>
                ))}
              </div>

              <p className="inf-ubicacion"><IcPin size={13} /> {g.ubicacion}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Pestaña: Equipos y sensores (HU-35, HU-36, HU-37) ──────────────── */}
      {tab === 'equipos' && (
        <>
          {/* Selector de galpón para filtrar equipos */}
          <div className="inf-selector">
            {GALPONES_INFRA.map(g => (
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
                  <th>Código</th><th>Tipo</th><th>Nombre</th><th>Zona</th>
                  <th>Vida útil</th><th>Último mto.</th><th>Próximo mto.</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {equiposGalpon.map(e => (
                  <FilaEquipo key={e.id} equipo={e} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: fila de equipo ──────────────────────────────────────────
function FilaEquipo({ equipo }: { equipo: Equipo }) {
  // Colores y etiquetas por estado del equipo
  const etiquetaEstado: Record<EstadoEquipo, string> = {
    activo:        'Activo',
    falla:         'Falla',
    mantenimiento: 'En mto.',
    inactivo:      'Inactivo',
  }

  // Color de la barra de vida útil según porcentaje
  const colorVida = equipo.vidaUtilPct >= 95 ? 'critico' : equipo.vidaUtilPct >= 75 ? 'advertencia' : 'ok'

  return (
    <tr className={`inf-fila inf-fila--${equipo.estado}`}>
      <td><code className="inf-codigo">{equipo.codigo}</code></td>
      <td className="inf-tipo"><span className="inf-tipo-icon">{TIPO_INFO[equipo.tipo].icon}</span> {TIPO_INFO[equipo.tipo].label}</td>
      <td>
        {equipo.nombre}
        {equipo.observacion && <><br /><small className="inf-obs">{equipo.observacion}</small></>}
      </td>
      <td>{equipo.zona}</td>
      <td>
        {/* Barra de vida útil */}
        <div className="inf-vida-wrap">
          <div className={`inf-vida-barra inf-vida-barra--${colorVida}`} style={{ width: `${equipo.vidaUtilPct}%` }} />
        </div>
        <small>{equipo.vidaUtilPct}%</small>
      </td>
      <td>{equipo.ultimoMantenimiento}</td>
      <td>{equipo.proximoMantenimiento}</td>
      <td>
        <span className={`inf-estado-badge inf-estado-badge--${equipo.estado}`}>
          {etiquetaEstado[equipo.estado]}
        </span>
      </td>
    </tr>
  )
}

export default InfraestructuraPage
