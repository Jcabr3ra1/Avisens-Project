import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface AnalisisBioacustico {
  id: number
  galpon_id: number
  lote_id: number | null
  modelo_id: number | null
  fecha_hora: string
  // Qué se midió del sonido del galpón: estrés, tos, densidad vocal…
  indicador: string | null
  valor: number | null
  audio_url: string | null
  interpretacion: string | null
}

export interface CrearAnalisisBioacusticoPayload {
  galpon_id: number
  lote_id?: number
  modelo_id?: number
  fecha_hora?: string
  indicador?: string
  valor?: number
  audio_url?: string
  interpretacion?: string
}

export type ActualizarAnalisisBioacusticoPayload =
  Partial<CrearAnalisisBioacusticoPayload>

export interface AnalisisBioacusticoQuery {
  galpon_id?: number
  lote_id?: number
  modelo_id?: number
  page?: number
  limit?: number
}

export async function listarAnalisisBioacustico(
  query: AnalisisBioacusticoQuery = {},
): Promise<AnalisisBioacustico[]> {
  const { data } = await api.get<PaginatedResponse<AnalisisBioacustico>>(
    '/analisis-bioacustico',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerAnalisisBioacustico(id: number): Promise<AnalisisBioacustico> {
  const { data } = await api.get<AnalisisBioacustico>(`/analisis-bioacustico/${id}`)
  return data
}

export async function crearAnalisisBioacustico(
  payload: CrearAnalisisBioacusticoPayload,
): Promise<AnalisisBioacustico> {
  const { data } = await api.post<AnalisisBioacustico>('/analisis-bioacustico', payload)
  return data
}

export async function actualizarAnalisisBioacustico(
  id: number,
  payload: ActualizarAnalisisBioacusticoPayload,
): Promise<AnalisisBioacustico> {
  const { data } = await api.patch<AnalisisBioacustico>(
    `/analisis-bioacustico/${id}`,
    payload,
  )
  return data
}

export async function eliminarAnalisisBioacustico(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/analisis-bioacustico/${id}`,
  )
  return data
}
