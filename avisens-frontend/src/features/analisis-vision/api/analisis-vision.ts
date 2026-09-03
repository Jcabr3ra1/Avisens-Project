import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface AnalisisVision {
  id: number
  galpon_id: number
  lote_id: number | null
  modelo_id: number | null
  fecha_hora: string
  tipo_analisis: string | null
  // Forma libre: cada tipo de análisis devuelve sus propias métricas.
  resultado: Record<string, unknown> | null
  imagen_url: string | null
}

export interface CrearAnalisisVisionPayload {
  galpon_id: number
  lote_id?: number
  modelo_id?: number
  fecha_hora?: string
  tipo_analisis?: string
  resultado?: Record<string, unknown>
  imagen_url?: string
}

export type ActualizarAnalisisVisionPayload = Partial<CrearAnalisisVisionPayload>

export interface AnalisisVisionQuery {
  galpon_id?: number
  lote_id?: number
  modelo_id?: number
  page?: number
  limit?: number
}

export async function listarAnalisisVision(
  query: AnalisisVisionQuery = {},
): Promise<AnalisisVision[]> {
  const { data } = await api.get<PaginatedResponse<AnalisisVision>>('/analisis-vision', {
    params: { page: 1, limit: 100, ...query },
  })
  return data.data
}

export async function obtenerAnalisisVision(id: number): Promise<AnalisisVision> {
  const { data } = await api.get<AnalisisVision>(`/analisis-vision/${id}`)
  return data
}

export async function crearAnalisisVision(
  payload: CrearAnalisisVisionPayload,
): Promise<AnalisisVision> {
  const { data } = await api.post<AnalisisVision>('/analisis-vision', payload)
  return data
}

export async function actualizarAnalisisVision(
  id: number,
  payload: ActualizarAnalisisVisionPayload,
): Promise<AnalisisVision> {
  const { data } = await api.patch<AnalisisVision>(`/analisis-vision/${id}`, payload)
  return data
}

export async function eliminarAnalisisVision(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/analisis-vision/${id}`,
  )
  return data
}
