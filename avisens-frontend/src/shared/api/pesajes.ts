import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Pesaje {
  id: number
  lote_id: number
  fecha: string
  peso_promedio_g: number
  cantidad_aves_pesadas: number | null
  peso_minimo_g: number | null
  peso_maximo_g: number | null
  peso_objetivo_g: number | null
  metodo_registro: string | null
  observaciones: string | null
}

export interface CrearPesajePayload {
  lote_id: number
  fecha: string
  peso_promedio_g: number
  cantidad_aves_pesadas?: number
  peso_minimo_g?: number
  peso_maximo_g?: number
  peso_objetivo_g?: number
  metodo_registro?: string
  observaciones?: string
}

export type ActualizarPesajePayload = Partial<CrearPesajePayload>

export async function listarPesajes(page = 1, limit = 20): Promise<Pesaje[]> {
  const { data } = await api.get<PaginatedResponse<Pesaje>>('/pesajes', {
    params: { page, limit },
  })
  return data.data
}

export async function obtenerPesaje(id: number): Promise<Pesaje> {
  const { data } = await api.get<Pesaje>(`/pesajes/${id}`)
  return data
}

export async function crearPesaje(payload: CrearPesajePayload): Promise<Pesaje> {
  const { data } = await api.post<Pesaje>('/pesajes', payload)
  return data
}

export async function actualizarPesaje(
  id: number,
  payload: ActualizarPesajePayload,
): Promise<Pesaje> {
  const { data } = await api.patch<Pesaje>(`/pesajes/${id}`, payload)
  return data
}

export async function eliminarPesaje(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/pesajes/${id}`,
  )
  return data
}
