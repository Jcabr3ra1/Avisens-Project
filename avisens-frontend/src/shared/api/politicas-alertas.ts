import { api } from './client'
import type { PaginatedResponse } from './types'

export interface PoliticaAlerta {
  id: number
  granja_id: number
  criticidad: string
  nivel_escalamiento: number | null
  canal: string | null
  tiempo_max_respuesta_seg: number | null
  verificado: boolean
  activa: boolean
}

export interface CrearPoliticaAlertaPayload {
  granja_id: number
  criticidad: string
  nivel_escalamiento?: number
  canal?: string
  tiempo_max_respuesta_seg?: number
  verificado?: boolean
  activa?: boolean
}

export async function listarPoliticasAlerta(): Promise<PoliticaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<PoliticaAlerta>>(
    '/politicas-alerta',
  )
  return data.data
}

export async function crearPoliticaAlerta(
  payload: CrearPoliticaAlertaPayload,
): Promise<PoliticaAlerta> {
  const { data } = await api.post<PoliticaAlerta>('/politicas-alerta', payload)
  return data
}

export async function actualizarPoliticaAlerta(
  id: number,
  payload: Partial<CrearPoliticaAlertaPayload>,
): Promise<PoliticaAlerta> {
  const { data } = await api.patch<PoliticaAlerta>(
    `/politicas-alerta/${id}`,
    payload,
  )
  return data
}

export async function activarPoliticaAlerta(
  id: number,
): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.patch<{ id: number; activa: boolean }>(
    `/politicas-alerta/${id}/activar`,
  )
  return data
}

export async function eliminarPoliticaAlerta(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/politicas-alerta/${id}`,
  )
  return data
}
