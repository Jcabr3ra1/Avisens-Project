import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type { ConsumoDiario, CrearConsumoDiarioPayload } from '../model/consumoDiario'

export type { ConsumoDiario, CrearConsumoDiarioPayload } from '../model/consumoDiario'

export async function listarConsumosDiarios(): Promise<ConsumoDiario[]> {
  return listarTodasLasPaginas<ConsumoDiario>('/consumos-diarios')
}

export async function crearConsumoDiario(payload: CrearConsumoDiarioPayload): Promise<ConsumoDiario> {
  const { data } = await api.post<ConsumoDiario>('/consumos-diarios', payload)
  return data
}

export async function actualizarConsumoDiario(id: number, payload: Partial<CrearConsumoDiarioPayload>): Promise<ConsumoDiario> {
  const { data } = await api.patch<ConsumoDiario>(`/consumos-diarios/${id}`, payload)
  return data
}

export async function eliminarConsumoDiario(id: number): Promise<void> { await api.delete(`/consumos-diarios/${id}`) }

export async function obtenerConsumoDiario(id: number): Promise<ConsumoDiario> {
  const { data } = await api.get<ConsumoDiario>(`/consumos-diarios/${id}`)
  return data
}
