import { api } from './client'
import type { PaginatedResponse } from './types'

export interface ConsumoDiario {
  id: number
  lote_id: number
  tipo_alimento_id: number | null
  fecha: string
  alimento_kg: number | null
  agua_litros: number | null
  alerta_agua_baja: boolean
  metodo_registro: string | null
}

export interface CrearConsumoDiarioPayload {
  lote_id: number
  fecha: string
  tipo_alimento_id?: number
  alimento_kg?: number
  agua_litros?: number
  metodo_registro?: string
}

export type ActualizarConsumoDiarioPayload = Partial<CrearConsumoDiarioPayload>

export async function listarConsumosDiarios(
  page = 1,
  limit = 20,
): Promise<ConsumoDiario[]> {
  const { data } = await api.get<PaginatedResponse<ConsumoDiario>>(
    '/consumos-diarios',
    { params: { page, limit } },
  )
  return data.data
}

export async function obtenerConsumoDiario(id: number): Promise<ConsumoDiario> {
  const { data } = await api.get<ConsumoDiario>(`/consumos-diarios/${id}`)
  return data
}

export async function crearConsumoDiario(
  payload: CrearConsumoDiarioPayload,
): Promise<ConsumoDiario> {
  const { data } = await api.post<ConsumoDiario>('/consumos-diarios', payload)
  return data
}

export async function actualizarConsumoDiario(
  id: number,
  payload: ActualizarConsumoDiarioPayload,
): Promise<ConsumoDiario> {
  const { data } = await api.patch<ConsumoDiario>(
    `/consumos-diarios/${id}`,
    payload,
  )
  return data
}

export async function eliminarConsumoDiario(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/consumos-diarios/${id}`,
  )
  return data
}
