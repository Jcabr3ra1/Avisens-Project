import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type {
  CrearDetalleOrdenPayload,
  CrearOrdenCompraPayload,
  DetalleOrdenCompra,
  OrdenCompra,
  RecibirOrdenPayload,
} from '../model/ordenCompra'

export type { CrearDetalleOrdenPayload, CrearOrdenCompraPayload, DetalleOrdenCompra, OrdenCompra, RecibirOrdenPayload } from '../model/ordenCompra'

export async function listarOrdenesCompra(): Promise<OrdenCompra[]> {
  const { data } = await api.get<PaginatedResponse<OrdenCompra>>('/ordenes-compra', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function obtenerOrdenCompra(id: number): Promise<OrdenCompra> {
  const { data } = await api.get<OrdenCompra>(`/ordenes-compra/${id}`)
  return data
}

export async function crearOrdenCompra(payload: CrearOrdenCompraPayload): Promise<OrdenCompra> {
  const { data } = await api.post<OrdenCompra>('/ordenes-compra', payload)
  return data
}

export async function actualizarOrdenCompra(id: number, payload: Partial<CrearOrdenCompraPayload> & { estado?: string }): Promise<OrdenCompra> {
  const { data } = await api.patch<OrdenCompra>(`/ordenes-compra/${id}`, payload)
  return data
}

export async function agregarDetalleOrden(id: number, payload: CrearDetalleOrdenPayload): Promise<DetalleOrdenCompra> {
  const { data } = await api.post<DetalleOrdenCompra>(`/ordenes-compra/${id}/detalles`, payload)
  return data
}

export async function eliminarDetalleOrden(id: number, detalleId: number): Promise<void> {
  await api.delete(`/ordenes-compra/${id}/detalles/${detalleId}`)
}

export async function recibirOrdenCompra(id: number, payload: RecibirOrdenPayload): Promise<void> {
  await api.post(`/ordenes-compra/${id}/recepciones`, payload)
}

export async function eliminarOrdenCompra(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/ordenes-compra/${id}`,
  )
  return data
}
