import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Galpon {
  id: number
  granja_id: number
  codigo: string
  nombre: string
  capacidad_aves: number | null
  ancho_metros: number | null
  largo_metros: number | null
  orientacion: string | null
  tipo_techo: string | null
  activo: boolean
}

export interface CrearGalponPayload {
  granja_id: number
  codigo: string
  nombre: string
  capacidad_aves?: number
  ancho_metros?: number
  largo_metros?: number
  orientacion?: string
  tipo_techo?: string
  plano_url?: string
  fecha_construccion?: string
}

export type ActualizarGalponPayload = Partial<CrearGalponPayload> & {
  activo?: boolean
}

export async function listarGalpones(): Promise<Galpon[]> {
  const { data } = await api.get<PaginatedResponse<Galpon>>('/galpones')
  return data.data
}

export async function obtenerGalpon(id: number): Promise<Galpon> {
  const { data } = await api.get<Galpon>(`/galpones/${id}`)
  return data
}

export async function crearGalpon(payload: CrearGalponPayload): Promise<Galpon> {
  const { data } = await api.post<Galpon>('/galpones', payload)
  return data
}

export async function actualizarGalpon(
  id: number,
  payload: ActualizarGalponPayload,
): Promise<Galpon> {
  const { data } = await api.patch<Galpon>(`/galpones/${id}`, payload)
  return data
}

export async function activarGalpon(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/galpones/${id}/activar`,
  )
  return data
}

export async function desactivarGalpon(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/galpones/${id}`,
  )
  return data
}

export async function eliminarGalponPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/galpones/${id}/permanente`,
  )
  return data
}
