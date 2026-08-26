import { api } from './client'
import type { PaginatedResponse } from './types'

export interface OrdenCompra {
  id: number
  proveedor_id: number
  lote_id: number | null
  codigo: string
  fecha_pedido: string | null
  fecha_entrega_estimada: string | null
  fecha_entrega_real: string | null
  valor_total_cop: number | null
  estado: string
  calificacion_cumplimiento: number | null
  calificacion_calidad: number | null
  calificacion_tiempo: number | null
  usuario_id: number
}

export interface CrearOrdenCompraPayload {
  proveedor_id: number
  codigo: string
  usuario_id: number
  lote_id?: number
  fecha_pedido?: string
  fecha_entrega_estimada?: string
  fecha_entrega_real?: string
  valor_total_cop?: number
  estado?: 'pendiente' | 'en_proceso' | 'entregada' | 'cancelada'
  calificacion_cumplimiento?: number
  calificacion_calidad?: number
  calificacion_tiempo?: number
}

export async function listarOrdenesCompra(): Promise<OrdenCompra[]> {
  const { data } = await api.get<PaginatedResponse<OrdenCompra>>('/ordenes-compra')
  return data.data
}

export async function obtenerOrdenCompra(id: number): Promise<OrdenCompra> {
  const { data } = await api.get<OrdenCompra>(`/ordenes-compra/${id}`)
  return data
}

export async function crearOrdenCompra(
  payload: CrearOrdenCompraPayload,
): Promise<OrdenCompra> {
  const { data } = await api.post<OrdenCompra>('/ordenes-compra', payload)
  return data
}

export async function actualizarOrdenCompra(
  id: number,
  payload: Partial<CrearOrdenCompraPayload>,
): Promise<OrdenCompra> {
  const { data } = await api.patch<OrdenCompra>(`/ordenes-compra/${id}`, payload)
  return data
}

export async function eliminarOrdenCompra(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/ordenes-compra/${id}`,
  )
  return data
}
