// FinanzasPage.tsx — Módulo de Finanzas (EP-07 HU-30, HU-33).
// Registro de ingresos y egresos del lote activo con balance consolidado.
// Los datos son mock; el backend real expondrá endpoints por lote.

import { useState } from 'react'
import {
  MOVIMIENTOS_MOCK,
  ETIQUETAS_CATEGORIA,
  type TipoMovimiento,
  type CategoriaFinanzas,
} from './data'
import './FinanzasPage.css'

// Formatea un número como moneda COP
function cop(valor: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

// ─── Componente principal ─────────────────────────────────────────────────────
function FinanzasPage() {
  // Filtro por tipo de movimiento: 'todos' | 'ingreso' | 'egreso'
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMovimiento>('todos')

  // Filtro por lote
  const [filtroLote, setFiltroLote] = useState<string>('todos')

  // Lotes únicos para el selector
  const lotes = [...new Set(MOVIMIENTOS_MOCK.map(m => m.lote))]

  // Movimientos filtrados según los controles
  const movimientos = MOVIMIENTOS_MOCK.filter(m => {
    const okTipo = filtroTipo === 'todos' || m.tipo === filtroTipo
    const okLote = filtroLote === 'todos' || m.lote === filtroLote
    return okTipo && okLote
  })

  // Totales para el resumen (sobre la lista filtrada)
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos  = movimientos.filter(m => m.tipo === 'egreso').reduce( (s, m) => s + m.monto, 0)
  const balance       = totalIngresos - totalEgresos

  return (
    <div className="page-container fin-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="fin-header">
        <div>
          <h1 className="fin-title">Finanzas</h1>
          <p className="fin-sub">Ingresos y egresos del ciclo productivo</p>
        </div>
      </header>

      {/* ── Tarjetas de resumen ──────────────────────────────────────────────── */}
      <div className="fin-resumen">
        <div className="fin-card-resumen fin-card-resumen--ingreso">
          <span className="fin-resumen-label">Ingresos</span>
          <span className="fin-resumen-valor">{cop(totalIngresos)}</span>
        </div>
        <div className="fin-card-resumen fin-card-resumen--egreso">
          <span className="fin-resumen-label">Egresos</span>
          <span className="fin-resumen-valor">{cop(totalEgresos)}</span>
        </div>
        <div className={`fin-card-resumen ${balance >= 0 ? 'fin-card-resumen--positivo' : 'fin-card-resumen--negativo'}`}>
          <span className="fin-resumen-label">Balance</span>
          <span className="fin-resumen-valor">{cop(balance)}</span>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="fin-filtros">
        {/* Selector de tipo */}
        <div className="fin-filtro-grupo">
          {(['todos', 'ingreso', 'egreso'] as const).map(t => (
            <button
              key={t}
              className={`fin-filtro-btn${filtroTipo === t ? ' fin-filtro-btn--activo' : ''}`}
              onClick={() => setFiltroTipo(t)}
            >
              {t === 'todos' ? 'Todos' : t === 'ingreso' ? '↑ Ingresos' : '↓ Egresos'}
            </button>
          ))}
        </div>

        {/* Selector de lote */}
        <select className="fin-select" value={filtroLote} onChange={e => setFiltroLote(e.target.value)}>
          <option value="todos">Todos los lotes</option>
          {lotes.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* ── Tabla de movimientos ─────────────────────────────────────────────── */}
      <div className="fin-tabla-card">
        {movimientos.length === 0
          ? <p className="fin-vacio">No hay movimientos con los filtros seleccionados.</p>
          : (
            <table className="fin-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Lote</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>
                      {/* Badge de tipo con color diferenciado */}
                      <span className={`fin-tipo-badge fin-tipo-badge--${m.tipo}`}>
                        {m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                      </span>
                    </td>
                    <td>
                      {/* Categoría formateada */}
                      <span className="fin-categoria">{ETIQUETAS_CATEGORIA[m.categoria as CategoriaFinanzas]}</span>
                    </td>
                    <td className="fin-desc">{m.descripcion}</td>
                    <td><span className="fin-lote-badge">{m.lote}</span></td>
                    <td className={`fin-monto fin-monto--${m.tipo}`}>
                      {m.tipo === 'ingreso' ? '+' : '-'}{cop(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}

export default FinanzasPage
