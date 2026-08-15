import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Proveedor {
  id: number
  nombre: string
  nit: string
  tipo_proveedor: string | null
  contacto_persona: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
}

export interface CrearProveedorPayload {
  nombre: string
  nit: string
  tipo_proveedor?: string
  contacto_persona?: string
  telefono?: string
  email?: string
  direccion?: string
}

export type ActualizarProveedorPayload = Partial<CrearProveedorPayload> & {
  activo?: boolean
}

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data } = await api.get<PaginatedResponse<Proveedor>>('/proveedores')
  return data.data
}

export async function obtenerProveedor(id: number): Promise<Proveedor> {
  const { data } = await api.get<Proveedor>(`/proveedores/${id}`)
  return data
}

export async function crearProveedor(
  payload: CrearProveedorPayload,
): Promise<Proveedor> {
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

export async function activarProveedor(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/proveedores/${id}/activar`,
  )
  return data
}

export async function desactivarProveedor(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/proveedores/${id}`,
  )
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
