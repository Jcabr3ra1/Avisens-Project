import { api } from './client'
import type { PaginatedResponse } from './types'

export interface RegistroPlaga {
  id: number
  lote_id: number
  insumo_id: number | null
  fecha: string
  tipo_plaga: string
  descripcion: string | null
  control_aplicado: string | null
  metodo_registro: string | null
  observaciones: string | null
}

export interface CrearRegistroPlagaPayload {
  lote_id: number
  fecha: string
  tipo_plaga: string
  insumo_id?: number
  descripcion?: string
  control_aplicado?: string
  metodo_registro?: string
  observaciones?: string
}

export type ActualizarRegistroPlagaPayload = Partial<CrearRegistroPlagaPayload>

export async function listarRegistrosPlagas(
  page = 1,
  limit = 20,
): Promise<RegistroPlaga[]> {
  const { data } = await api.get<PaginatedResponse<RegistroPlaga>>(
    '/registros-plagas',
    { params: { page, limit } },
  )
  return data.data
}

export async function obtenerRegistroPlaga(id: number): Promise<RegistroPlaga> {
  const { data } = await api.get<RegistroPlaga>(`/registros-plagas/${id}`)
  return data
}

export async function crearRegistroPlaga(
  payload: CrearRegistroPlagaPayload,
): Promise<RegistroPlaga> {
  const { data } = await api.post<RegistroPlaga>('/registros-plagas', payload)
  return data
}

export async function actualizarRegistroPlaga(
  id: number,
  payload: ActualizarRegistroPlagaPayload,
): Promise<RegistroPlaga> {
  const { data } = await api.patch<RegistroPlaga>(
    `/registros-plagas/${id}`,
    payload,
  )
  return data
}

export async function eliminarRegistroPlaga(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/registros-plagas/${id}`,
  )
  return data
}
