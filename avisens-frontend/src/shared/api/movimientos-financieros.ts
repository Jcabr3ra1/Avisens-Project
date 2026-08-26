import { api } from './client'
import type { PaginatedResponse } from './types'

export interface MovimientoFinanciero {
  id: number
  categoria_id: number
  tipo: 'ingreso' | 'egreso'
  valor_cop: number
  fecha: string
  lote_id: number | null
  proveedor_id: number | null
  descripcion: string | null
  numero_factura: string | null
  metodo_pago: string | null
}

export interface CrearMovimientoPayload {
  categoria_id: number
  tipo: 'ingreso' | 'egreso'
  valor_cop: number
  fecha: string
  lote_id?: number
  proveedor_id?: number
  descripcion?: string
  numero_factura?: string
  metodo_pago?: string
}

export async function listarMovimientos(
  query?: { lote_id?: number; tipo?: string },
): Promise<MovimientoFinanciero[]> {
  const { data } = await api.get<PaginatedResponse<MovimientoFinanciero>>(
    '/movimientos-financieros',
    { params: query },
  )
  return data.data
}

export async function obtenerMovimiento(
  id: number,
): Promise<MovimientoFinanciero> {
  const { data } = await api.get<MovimientoFinanciero>(
    `/movimientos-financieros/${id}`,
  )
  return data
}

export async function crearMovimiento(
  payload: CrearMovimientoPayload,
): Promise<MovimientoFinanciero> {
  const { data } = await api.post<MovimientoFinanciero>(
    '/movimientos-financieros',
    payload,
  )
  return data
}

export async function actualizarMovimiento(
  id: number,
  payload: Partial<CrearMovimientoPayload>,
): Promise<MovimientoFinanciero> {
  const { data } = await api.patch<MovimientoFinanciero>(
    `/movimientos-financieros/${id}`,
    payload,
  )
  return data
}

export async function eliminarMovimiento(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/movimientos-financieros/${id}`,
  )
  return data
}
