import { api, type PaginatedResponse } from '@shared/api'
import type {
  ActualizarProveedorPayload,
  CrearProveedorPayload,
  Proveedor,
} from '../model/proveedor'

export type {
  ActualizarProveedorPayload,
  CrearProveedorPayload,
  Proveedor,
} from '../model/proveedor'

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data } = await api.get<PaginatedResponse<Proveedor>>('/proveedores', {
    params: { page: 1, limit: 100 },
  })

  return data.data
}

export async function crearProveedor(payload: CrearProveedorPayload): Promise<Proveedor> {
  const { data } = await api.post<Proveedor>('/proveedores', payload)
  return data
}

export async function actualizarProveedor(
  id: number,
  payload: ActualizarProveedorPayload,
): Promise<Proveedor> {
  const { data } = await api.patch<Proveedor>(`/proveedores/${id}`, payload)
  return data
}

export async function activarProveedor(id: number): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(`/proveedores/${id}/activar`)
  return data
}

export async function desactivarProveedor(id: number): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(`/proveedores/${id}`)
  return data
}

export async function eliminarProveedorPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/proveedores/${id}/permanente`,
  )
  return data
}
