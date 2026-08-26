import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Insumo {
  id: number
  nombre: string
  tipo: string | null
  unidad_medida: string | null
  stock_actual: number | null
  stock_minimo: number | null
  activo: boolean
}

export interface CrearInsumoPayload {
  nombre: string
  tipo?: string
  unidad_medida?: string
  stock_actual?: number
  stock_minimo?: number
}

export type ActualizarInsumoPayload = Partial<CrearInsumoPayload> & {
  activo?: boolean
}

export async function listarInsumos(): Promise<Insumo[]> {
  const { data } = await api.get<PaginatedResponse<Insumo>>('/insumos')
  return data.data
}

export async function obtenerInsumo(id: number): Promise<Insumo> {
  const { data } = await api.get<Insumo>(`/insumos/${id}`)
  return data
}

export async function crearInsumo(payload: CrearInsumoPayload): Promise<Insumo> {
  const { data } = await api.post<Insumo>('/insumos', payload)
  return data
}

export async function actualizarInsumo(
  id: number,
  payload: ActualizarInsumoPayload,
): Promise<Insumo> {
  const { data } = await api.patch<Insumo>(`/insumos/${id}`, payload)
  return data
}

export async function activarInsumo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/insumos/${id}/activar`,
  )
  return data
}

export async function desactivarInsumo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/insumos/${id}`,
  )
  return data
}

export async function eliminarInsumoPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/insumos/${id}/permanente`,
  )
  return data
}
