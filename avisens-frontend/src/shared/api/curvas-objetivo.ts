import { api } from './client'
import type { PaginatedResponse } from './types'

export interface CurvaObjetivo {
  id: number
  marca: string
  fuente: string | null
  sexo: string
  dia: number
  peso_esperado_g: number | null
  consumo_diario_g: number | null
  consumo_acumulado_g: number | null
  fcr_objetivo: number | null
  etapa_alimentacion: string | null
  temperatura_min: number | null
  temperatura_max: number | null
}

export interface CurvasObjetivoQuery {
  marca?: string
  sexo?: string
  page?: number
  limit?: number
}

export interface CrearCurvaObjetivoPayload {
  marca: string
  sexo: string
  dia: number
  fuente?: string
  peso_esperado_g?: number
  consumo_diario_g?: number
  consumo_acumulado_g?: number
  fcr_objetivo?: number
  etapa_alimentacion?: string
  temperatura_min?: number
  temperatura_max?: number
}

export type ActualizarCurvaObjetivoPayload = Partial<CrearCurvaObjetivoPayload>

export async function listarCurvasObjetivo(
  query: CurvasObjetivoQuery = {},
): Promise<CurvaObjetivo[]> {
  const { data } = await api.get<PaginatedResponse<CurvaObjetivo>>(
    '/curvas-objetivo',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerCurvaObjetivo(id: number): Promise<CurvaObjetivo> {
  const { data } = await api.get<CurvaObjetivo>(`/curvas-objetivo/${id}`)
  return data
}

export async function crearCurvaObjetivo(
  payload: CrearCurvaObjetivoPayload,
): Promise<CurvaObjetivo> {
  const { data } = await api.post<CurvaObjetivo>('/curvas-objetivo', payload)
  return data
}

export async function actualizarCurvaObjetivo(
  id: number,
  payload: ActualizarCurvaObjetivoPayload,
): Promise<CurvaObjetivo> {
  const { data } = await api.patch<CurvaObjetivo>(
    `/curvas-objetivo/${id}`,
    payload,
  )
  return data
}

export async function eliminarCurvaObjetivo(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/curvas-objetivo/${id}`,
  )
  return data
}
