import type { MovimientoInventario } from '../api/movimientos'
import { ETIQUETA_MOVIMIENTO, signoDeMovimiento } from '../model/inventario'

interface Props {
  movimientos: MovimientoInventario[]
  cargando: boolean
  unidad: string
}

function HistorialMovimientos({ movimientos, cargando, unidad }: Props) {
  if (cargando) return <p className="inv-historial-estado">Cargando movimientos…</p>

  if (movimientos.length === 0) {
    return (
      <p className="inv-historial-estado">
        Este insumo todavía no tiene movimientos registrados.
      </p>
    )
  }

  return (
    <ul className="inv-historial">
      {movimientos.map((movimiento) => (
        <li key={movimiento.id} className={`inv-mov inv-mov--${movimiento.tipo_movimiento}`}>
          <span className="inv-mov-tipo">{ETIQUETA_MOVIMIENTO[movimiento.tipo_movimiento]}</span>
          <span className="inv-mov-cantidad">
            {signoDeMovimiento(movimiento.tipo_movimiento)}
            {movimiento.cantidad.toLocaleString()}
            <small>{movimiento.unidad_medida ?? unidad}</small>
          </span>
          <span className="inv-mov-detalle">
            {movimiento.motivo || 'Sin motivo registrado'}
            {movimiento.detalle_orden_compra_id !== null && (
              <em> · recepción de compra</em>
            )}
          </span>
          <span className="inv-mov-pie">
            {movimiento.fecha_movimiento.slice(0, 10)}
            {movimiento.stock_resultante !== null && (
              <> · quedó {movimiento.stock_resultante.toLocaleString()} {unidad}</>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default HistorialMovimientos
