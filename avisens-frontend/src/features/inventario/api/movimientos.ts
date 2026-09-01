import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface MovimientoInventario {
  id: number
  insumo_id: number
  lote_id: number | null
  tipo_movimiento: TipoMovimiento
  cantidad: number
  unidad_medida: string | null
  motivo: string | null
  comprobante_url: string | null
  // El backend guarda el stock que quedó tras el movimiento: es lo que
  // permite auditar la bodega sin recalcular toda la historia.
  stock_resultante: number | null
  usuario_id: number
  detalle_orden_compra_id: number | null
  fecha_movimiento: string
}

export interface CrearMovimientoPayload {
  insumo_id: number
  tipo_movimiento: TipoMovimiento
  cantidad: number
  motivo?: string
  lote_id?: number
  comprobante_url?: string
}

export interface MovimientosQuery {
  insumo_id?: number
  lote_id?: number
  tipo_movimiento?: TipoMovimiento
  page?: number
  limit?: number
}

export async function listarMovimientos(
  query: MovimientosQuery = {},
): Promise<MovimientoInventario[]> {
  const { data } = await api.get<PaginatedResponse<MovimientoInventario>>(
    '/movimientos-inventario',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerMovimiento(id: number): Promise<MovimientoInventario> {
  const { data } = await api.get<MovimientoInventario>(`/movimientos-inventario/${id}`)
  return data
}

export async function crearMovimiento(
  payload: CrearMovimientoPayload,
): Promise<MovimientoInventario> {
  const { data } = await api.post<MovimientoInventario>(
    '/movimientos-inventario',
    payload,
  )
  return data
}
