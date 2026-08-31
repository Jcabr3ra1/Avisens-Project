import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface ZonaGalpon {
  id: number
  galpon_id: number
  nombre: string
  codigo: string | null
  tipo_zona: string | null
  coordenada_x_inicio: number | null
  coordenada_y_inicio: number | null
  coordenada_x_fin: number | null
  coordenada_y_fin: number | null
  color_visualizacion: string | null
  activa: boolean
}

export interface CrearZonaPayload {
  galpon_id: number
  nombre: string
  codigo?: string
  tipo_zona?: string
  coordenada_x_inicio?: number
  coordenada_y_inicio?: number
  coordenada_x_fin?: number
  coordenada_y_fin?: number
  color_visualizacion?: string
}

export type ActualizarZonaPayload = Partial<CrearZonaPayload> & { activa?: boolean }

export async function listarZonas(galponId?: number): Promise<ZonaGalpon[]> {
  const { data } = await api.get<PaginatedResponse<ZonaGalpon>>('/zonas-galpon', {
    params: { page: 1, limit: 200, galpon_id: galponId },
  })
  return data.data
}

export async function obtenerZona(id: number): Promise<ZonaGalpon> {
  const { data } = await api.get<ZonaGalpon>(`/zonas-galpon/${id}`)
  return data
}

export async function crearZona(payload: CrearZonaPayload): Promise<ZonaGalpon> {
  const { data } = await api.post<ZonaGalpon>('/zonas-galpon', payload)
  return data
}

export async function actualizarZona(
  id: number,
  payload: ActualizarZonaPayload,
): Promise<ZonaGalpon> {
  const { data } = await api.patch<ZonaGalpon>(`/zonas-galpon/${id}`, payload)
  return data
}

export async function eliminarZona(id: number): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/zonas-galpon/${id}`,
  )
  return data
}
