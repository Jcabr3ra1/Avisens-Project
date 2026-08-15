import { api } from './client'
import type { PaginatedResponse } from './types'

export interface RegistroMortalidad {
  id: number
  lote_id: number
  fecha: string
  cantidad_aves: number
  causa_presuntiva: string | null
  disposicion: string | null
  metodo_registro: string | null
  observaciones: string | null
}

export interface CrearRegistroMortalidadPayload {
  lote_id: number
  fecha: string
  cantidad_aves: number
  causa_presuntiva?: string
  disposicion?: string
  metodo_registro?: string
  observaciones?: string
}

export type ActualizarRegistroMortalidadPayload =
  Partial<CrearRegistroMortalidadPayload>

export async function listarRegistrosMortalidad(
  page = 1,
  limit = 20,
): Promise<RegistroMortalidad[]> {
  const { data } = await api.get<PaginatedResponse<RegistroMortalidad>>(
    '/registros-mortalidad',
    { params: { page, limit } },
  )
  return data.data
}

export async function obtenerRegistroMortalidad(
  id: number,
): Promise<RegistroMortalidad> {
  const { data } = await api.get<RegistroMortalidad>(
    `/registros-mortalidad/${id}`,
  )
  return data
}

export async function crearRegistroMortalidad(
  payload: CrearRegistroMortalidadPayload,
): Promise<RegistroMortalidad> {
  const { data } = await api.post<RegistroMortalidad>(
    '/registros-mortalidad',
    payload,
  )
  return data
}

export async function actualizarRegistroMortalidad(
  id: number,
  payload: ActualizarRegistroMortalidadPayload,
): Promise<RegistroMortalidad> {
  const { data } = await api.patch<RegistroMortalidad>(
    `/registros-mortalidad/${id}`,
    payload,
  )
  return data
}

export async function eliminarRegistroMortalidad(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/registros-mortalidad/${id}`,
  )
  return data
}
