import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Umbral {
  id: number
  sensor_id: number
  galpon_id?: number
  variable?: string
  semana_vida?: number
  valor_min: number | null
  valor_max: number | null
  valor_minimo?: number | null
  valor_maximo?: number | null
  version: number
  vigente: boolean
  fecha_creacion: string
}

export interface CrearUmbralPayload {
  sensor_id: number
  valor_min?: number
  valor_max?: number
}

export async function listarUmbrales(
  incluirHistorico = false,
): Promise<Umbral[]> {
  const { data } = await api.get<PaginatedResponse<Umbral>>('/umbrales', {
    params: { incluir_historico: incluirHistorico },
  })
  return data.data
}

export async function obtenerUmbral(id: number): Promise<Umbral> {
  const { data } = await api.get<Umbral>(`/umbrales/${id}`)
  return data
}

export async function crearUmbral(payload: CrearUmbralPayload): Promise<Umbral> {
  const { data } = await api.post<Umbral>('/umbrales', payload)
  return data
}

export async function revisarUmbral(
  id: number,
  payload: Partial<CrearUmbralPayload>,
): Promise<Umbral> {
  const { data } = await api.patch<Umbral>(`/umbrales/${id}/revisar`, payload)
  return data
}

export async function jubilarUmbral(
  id: number,
): Promise<{ id: number; vigente: boolean }> {
  const { data } = await api.delete<{ id: number; vigente: boolean }>(
    `/umbrales/${id}`,
  )
  return data
}
