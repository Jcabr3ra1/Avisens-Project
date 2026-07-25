// InventarioPage.tsx — Módulo de Inventario (EP-07 HU-31, HU-32).
// Muestra el stock de insumos con semáforo de nivel y el directorio de proveedores.

import { useState } from 'react'
import {
  INSUMOS_MOCK,
  PROVEEDORES_MOCK,
  type InsumoInventario,
  type EstadoStock,
  type CalificacionProveedor,
} from './data'
import { IcBox, IcUsers } from '@shared/ui/icons/icons'
import './InventarioPage.css'

// ─── Componente principal ─────────────────────────────────────────────────────
function InventarioPage() {
  // Pestaña activa: insumos o proveedores
  const [tab, setTab] = useState<'insumos' | 'proveedores'>('insumos')

  // Contadores de alertas de stock para el encabezado
  const stockCritico = INSUMOS_MOCK.filter(i => i.estado === 'critico').length
  const stockBajo    = INSUMOS_MOCK.filter(i => i.estado === 'bajo').length

  return (
    <div className="page-container inv-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="inv-header">
        <div>
          <h1 className="inv-title">Bodega e Inventario</h1>
          <p className="inv-sub">Stock de insumos y directorio de proveedores</p>
        </div>

        {/* Alertas de stock */}
        <div className="inv-alertas">
          {stockCritico > 0 && (
            <span className="inv-alerta inv-alerta--critico"><span className="inv-dot inv-dot--critico" /> {stockCritico} crítico{stockCritico > 1 ? 's' : ''}</span>
          )}
          {stockBajo > 0 && (
            <span className="inv-alerta inv-alerta--bajo"><span className="inv-dot inv-dot--bajo" /> {stockBajo} bajo{stockBajo > 1 ? 's' : ''}</span>
          )}
        </div>
      </header>

      {/* ── Pestañas ────────────────────────────────────────────────────────── */}
      <div className="inv-tabs">
        <button className={`inv-tab${tab === 'insumos' ? ' inv-tab--activo' : ''}`} onClick={() => setTab('insumos')}>
          <IcBox size={14} /> Insumos
        </button>
        <button className={`inv-tab${tab === 'proveedores' ? ' inv-tab--activo' : ''}`} onClick={() => setTab('proveedores')}>
          <IcUsers size={14} /> Proveedores
        </button>
      </div>

      {/* ── Pestaña: Insumos (HU-31) ────────────────────────────────────────── */}
      {tab === 'insumos' && (
        <div className="inv-grid">
          {INSUMOS_MOCK.map(insumo => (
            <TarjetaInsumo key={insumo.id} insumo={insumo} />
          ))}
        </div>
      )}

      {/* ── Pestaña: Proveedores (HU-32) ────────────────────────────────────── */}
      {tab === 'proveedores' && (
        <div className="inv-tabla-card">
          <table className="inv-tabla">
            <thead>
              <tr><th>Proveedor</th><th>NIT</th><th>Catálogo</th><th>Cumplimiento</th><th>Calidad</th><th>Entrega</th><th>Calificación</th></tr>
            </thead>
            <tbody>
              {PROVEEDORES_MOCK.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nombre}</strong><br />
                    <small className="inv-contacto">{p.contacto} · {p.telefono}</small>
                  </td>
                  <td>{p.nit}</td>
                  <td className="inv-catalogo">{p.catalogo}</td>
                  {/* Puntuación 1-5 con estrellas */}
                  <td>{estrellas(p.puntajeCumplimiento)}</td>
                  <td>{estrellas(p.puntajeCalidad)}</td>
                  <td>{estrellas(p.puntajeEntrega)}</td>
                  <td>
                    <span className={`inv-cal-badge inv-cal-badge--${p.calificacion}`}>
                      <span className={`inv-dot inv-dot--${p.calificacion}`} />
                      {etiquetaCalificacion(p.calificacion)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: tarjeta de insumo ───────────────────────────────────────
function TarjetaInsumo({ insumo }: { insumo: InsumoInventario }) {
  // Porcentaje del stock actual respecto a la capacidad máxima estimada
  // Usamos 2× el stock mínimo como referencia visual máxima
  const pct = Math.min(100, (insumo.stockActual / (insumo.stockMinimo * 2)) * 100)

  const etiquetaEstado: Record<EstadoStock, string> = {
    ok:      'Stock OK',
    bajo:    'Stock bajo',
    critico: 'Stock crítico',
  }

  return (
    <div className={`inv-insumo-card inv-insumo-card--${insumo.estado}`}>
      {/* Cabecera: nombre y categoría */}
      <div className="inv-insumo-head">
        <span className="inv-insumo-nombre">{insumo.nombre}</span>
        <span className="inv-cat-badge">{insumo.categoria}</span>
      </div>

      {/* Stock actual */}
      <div className="inv-insumo-stock">
        <strong>{insumo.stockActual.toLocaleString()}</strong>
        <span>{insumo.unidad}</span>
      </div>

      {/* Barra de nivel de stock */}
      <div className="inv-stock-barra-wrap">
        <div className={`inv-stock-barra inv-stock-barra--${insumo.estado}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Información adicional */}
      <div className="inv-insumo-info">
        <span>Mínimo: {insumo.stockMinimo} {insumo.unidad}</span>
        <span>Autonomía: {insumo.diasAutonomia} días</span>
      </div>

      {/* Proveedor y última compra */}
      <div className="inv-insumo-footer">
        <span className="inv-proveedor">{insumo.proveedor}</span>
        <span className={`inv-estado-badge inv-estado-badge--${insumo.estado}`}>
          {etiquetaEstado[insumo.estado]}
        </span>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Muestra estrellas para puntaje 1-5
function estrellas(puntaje: number): string {
  return '★'.repeat(puntaje) + '☆'.repeat(5 - puntaje)
}

// Etiqueta de la calificación del proveedor
function etiquetaCalificacion(cal: CalificacionProveedor): string {
  return { verde: 'Excelente', amarillo: 'Regular', rojo: 'Deficiente' }[cal]
}

export default InventarioPage
