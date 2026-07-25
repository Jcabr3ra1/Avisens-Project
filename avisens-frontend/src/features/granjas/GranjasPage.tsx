// GranjasPage.tsx — Módulo de Granjas (EP-08 HU-34).
// Muestra las granjas del propietario con sus galpones y estado de cada lote.

import { useState } from 'react'
import { GRANJAS_DETALLE, type GalponDetalle, type EstadoGalpon } from './data'
import { IcPin } from '@shared/ui/icons/icons'
import './GranjasPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function GranjasPage() {
  // Granja expandida para ver sus galpones
  const [granjaExpandida, setGranjaExpandida] = useState<number | null>(1)

  // Totales globales del propietario para el encabezado
  const totalGalpones = GRANJAS_DETALLE.reduce((s, g) => s + g.galpones.length, 0)
  const totalAves     = GRANJAS_DETALLE.flatMap(g => g.galpones).reduce((s, g) => s + g.avesActuales, 0)
  const galponesActivos = GRANJAS_DETALLE.flatMap(g => g.galpones).filter(g => g.estado === 'activo').length

  return (
    <div className="page-container grj-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="grj-header">
        <div>
          <h1 className="grj-title">Mis Granjas</h1>
          <p className="grj-sub">Gestión de granjas y galpones del propietario</p>
        </div>
      </header>

      {/* ── Resumen global ──────────────────────────────────────────────────── */}
      <div className="grj-resumen">
        <div className="grj-stat">
          <span className="grj-stat-valor">{GRANJAS_DETALLE.length}</span>
          <span className="grj-stat-label">Granjas</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{totalGalpones}</span>
          <span className="grj-stat-label">Galpones</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{galponesActivos}</span>
          <span className="grj-stat-label">Activos</span>
        </div>
        <div className="grj-stat">
          <span className="grj-stat-valor">{totalAves.toLocaleString()}</span>
          <span className="grj-stat-label">Aves totales</span>
        </div>
      </div>

      {/* ── Lista de granjas ─────────────────────────────────────────────────── */}
      <div className="grj-lista">
        {GRANJAS_DETALLE.map(granja => (
          <div key={granja.id} className="grj-card">

            {/* Cabecera de la granja — click para expandir/colapsar */}
            <button
              className="grj-card-head"
              onClick={() => setGranjaExpandida(granjaExpandida === granja.id ? null : granja.id)}
            >
              <div className="grj-card-info">
                <span className="grj-nombre">{granja.nombre}</span>
                <span className="grj-ubicacion"><IcPin size={13} /> {granja.municipio}, {granja.departamento}</span>
              </div>
              <div className="grj-card-meta">
                <span>{granja.galpones.length} galpones</span>
                <span>{granja.areaTotalHa} ha</span>
                <span className="grj-chevron">{granjaExpandida === granja.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Tabla de galpones — visible solo cuando la granja está expandida */}
            {granjaExpandida === granja.id && (
              <div className="grj-galpones">
                <table className="grj-tabla">
                  <thead>
                    <tr>
                      <th>Código</th><th>Nombre</th><th>Área (m²)</th><th>Capacidad</th>
                      <th>Aves actuales</th><th>Día de vida</th><th>Lote activo</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {granja.galpones.map(g => (
                      <FilaGalpon key={g.id} galpon={g} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-componente: fila de galpón ──────────────────────────────────────────
function FilaGalpon({ galpon }: { galpon: GalponDetalle }) {
  const etiqueta: Record<EstadoGalpon, string> = {
    activo:        'Activo',
    vacio:         'Vacío',
    preparacion:   'Preparando',
    mantenimiento: 'Mto.',
  }

  return (
    <tr className={`grj-fila grj-fila--${galpon.estado}`}>
      <td><code>{galpon.codigo}</code></td>
      <td>{galpon.nombre}</td>
      <td>{galpon.areaM2.toLocaleString()}</td>
      <td>{galpon.capacidadAves.toLocaleString()}</td>
      <td>{galpon.avesActuales > 0 ? galpon.avesActuales.toLocaleString() : '—'}</td>
      <td>{galpon.diaVida > 0 ? `Día ${galpon.diaVida}` : '—'}</td>
      <td>{galpon.loteActual ?? '—'}</td>
      <td>
        <span className={`grj-estado grj-estado--${galpon.estado}`}>
          <span className={`grj-dot grj-dot--${galpon.estado}`} />
          {etiqueta[galpon.estado]}
        </span>
      </td>
    </tr>
  )
}

export default GranjasPage
