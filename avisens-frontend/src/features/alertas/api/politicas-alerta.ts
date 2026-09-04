import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface GranjaDePolitica {
  id: number
  nombre: string
  propietario_id: number
}

export interface PoliticaAlerta {
  id: number
  granja_id: number
  criticidad: string
  nivel_escalamiento: number | null
  canal: string | null
  tiempo_max_respuesta_seg: number | null
  verificado: boolean
  activa: boolean
  fecha_actualizacion: string
  granja: GranjaDePolitica
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

export type ActualizarPoliticaAlertaPayload = Partial<CrearPoliticaAlertaPayload>

export interface PoliticasAlertaQuery {
  page?: number
  limit?: number
}

export async function listarPoliticasAlerta(
  query: PoliticasAlertaQuery = {},
): Promise<PoliticaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<PoliticaAlerta>>(
    '/politicas-alerta',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerPoliticaAlerta(id: number): Promise<PoliticaAlerta> {
  const { data } = await api.get<PoliticaAlerta>(`/politicas-alerta/${id}`)
  return data
}

export async function crearPoliticaAlerta(
  payload: CrearPoliticaAlertaPayload,
): Promise<PoliticaAlerta> {
  const { data } = await api.post<PoliticaAlerta>('/politicas-alerta', payload)
  return data
}

export async function actualizarPoliticaAlerta(
  id: number,
  payload: ActualizarPoliticaAlertaPayload,
): Promise<PoliticaAlerta> {
  const { data } = await api.patch<PoliticaAlerta>(
    `/politicas-alerta/${id}`,
    payload,
  )
  return data
}

export async function activarPoliticaAlerta(id: number): Promise<PoliticaAlerta> {
  const { data } = await api.patch<PoliticaAlerta>(
    `/politicas-alerta/${id}/activar`,
    {},
  )
  return data
}

export async function desactivarPoliticaAlerta(id: number): Promise<PoliticaAlerta> {
  const { data } = await api.delete<PoliticaAlerta>(`/politicas-alerta/${id}`)
  return data
}
