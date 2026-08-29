// InventarioPage.tsx — Módulo de Inventario (EP-07 HU-31, HU-32).
// Muestra el stock de insumos con semáforo de nivel y el directorio de proveedores.
// Consume /insumos y /proveedores. El backend no guarda días de autonomía ni
// calificación de desempeño del proveedor — esos dos campos del diseño
// original no están en la UI porque no existen en el modelo de datos. El
// precio unitario y el proveedor habitual sí existen y ya se muestran.

import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  listarInsumos,
  type Insumo,
} from '@shared/api'
import { listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'
import { IcBox, IcUsers } from '@shared/ui/icons/icons'
import './InventarioPage.css'

type EstadoStock = 'ok' | 'bajo' | 'critico'

function estadoStock(insumo: Insumo): EstadoStock {
  if (!insumo.stock_minimo) return 'ok'
  const ratio = insumo.stock_actual / insumo.stock_minimo
  if (ratio < 0.5) return 'critico'
  if (ratio < 1) return 'bajo'
  return 'ok'
}

// ─── Componente principal ─────────────────────────────────────────────────────
function InventarioPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Pestaña activa: insumos o proveedores
  const [tab, setTab] = useState<'insumos' | 'proveedores'>('insumos')

  useEffect(() => {
    let activo = true

    async function cargar() {
      try {
        const [insumosData, proveedoresData] = await Promise.all([
          listarInsumos(),
          listarProveedores(),
        ])
        if (!activo) return
        setInsumos(insumosData)
        setProveedores(proveedoresData)
        setError('')
      } catch (err) {
        if (!activo) return
        setError(
          isAxiosError(err) && err.response?.status === 403
            ? 'No tienes permisos para ver el inventario.'
            : 'No se pudo cargar el inventario.',
        )
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [])

  // Contadores de alertas de stock para el encabezado
  const stockCritico = insumos.filter(i => estadoStock(i) === 'critico').length
  const stockBajo    = insumos.filter(i => estadoStock(i) === 'bajo').length

  if (cargando) {
    return (
      <div className="page-container inv-page">
        <p className="inv-vacio">Cargando inventario…</p>
      </div>
    )
  }

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

      {error && <div className="inv-alert-error" role="alert">{error}</div>}

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
        insumos.length === 0 ? (
          <p className="inv-vacio">No hay insumos registrados todavía.</p>
        ) : (
          <div className="inv-grid">
            {insumos.map(insumo => (
              <TarjetaInsumo key={insumo.id} insumo={insumo} proveedores={proveedores} />
            ))}
          </div>
        )
      )}

      {/* ── Pestaña: Proveedores (HU-32) ────────────────────────────────────── */}
      {tab === 'proveedores' && (
        proveedores.length === 0 ? (
          <p className="inv-vacio">No hay proveedores registrados todavía.</p>
        ) : (
          <div className="inv-tabla-card">
            <table className="inv-tabla">
              <thead>
                <tr><th>Proveedor</th><th>NIT</th><th>Tipo</th><th>Contacto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {proveedores.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong><br />
                      <small className="inv-contacto">{p.email ?? p.direccion ?? '—'}</small>
                    </td>
                    <td>{p.nit}</td>
                    <td className="inv-catalogo">{p.tipo_proveedor ?? '—'}</td>
                    <td>{p.contacto_persona ?? '—'} {p.telefono ? `· ${p.telefono}` : ''}</td>
                    <td>
                      <span className={`inv-cal-badge inv-cal-badge--${p.activo ? 'verde' : 'rojo'}`}>
                        <span className={`inv-dot inv-dot--${p.activo ? 'verde' : 'rojo'}`} />
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ─── Sub-componente: tarjeta de insumo ───────────────────────────────────────
function TarjetaInsumo({ insumo, proveedores }: { insumo: Insumo; proveedores: Proveedor[] }) {
  const estado = estadoStock(insumo)
  // Porcentaje del stock actual respecto a la capacidad máxima estimada
  // Usamos 2× el stock mínimo como referencia visual máxima
  const pct = insumo.stock_minimo > 0 ? Math.min(100, (insumo.stock_actual / (insumo.stock_minimo * 2)) * 100) : 100
  const proveedor = proveedores.find(p => p.id === insumo.proveedor_habitual_id)

  const etiquetaEstado: Record<EstadoStock, string> = {
    ok:      'Stock OK',
    bajo:    'Stock bajo',
    critico: 'Stock crítico',
  }

  return (
    <div className={`inv-insumo-card inv-insumo-card--${estado}`}>
      {/* Cabecera: nombre y tipo */}
      <div className="inv-insumo-head">
        <span className="inv-insumo-nombre">{insumo.nombre}</span>
        {insumo.tipo && <span className="inv-cat-badge">{insumo.tipo}</span>}
      </div>

      {/* Stock actual */}
      <div className="inv-insumo-stock">
        <strong>{insumo.stock_actual.toLocaleString()}</strong>
        <span>{insumo.unidad_medida}</span>
      </div>

      {/* Barra de nivel de stock */}
      <div className="inv-stock-barra-wrap">
        <div className={`inv-stock-barra inv-stock-barra--${estado}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Información adicional */}
      <div className="inv-insumo-info">
        <span>Mínimo: {insumo.stock_minimo} {insumo.unidad_medida}</span>
        {insumo.precio_unitario_cop != null && (
          <span>{insumo.precio_unitario_cop.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}/{insumo.unidad_medida}</span>
        )}
      </div>

      {/* Proveedor y estado */}
      <div className="inv-insumo-footer">
        <span className="inv-proveedor">{proveedor?.nombre ?? (insumo.activo ? 'Insumo activo' : 'Insumo inactivo')}</span>
        <span className={`inv-estado-badge inv-estado-badge--${estado}`}>
          {etiquetaEstado[estado]}
        </span>
      </div>
    </div>
  )
}

export default InventarioPage
