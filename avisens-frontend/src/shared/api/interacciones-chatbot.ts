import { api } from './client'
import type { PaginatedResponse } from './types'

export interface InteraccionChatbot {
  id: number
  prospecto_id: number
  tipo: string | null
  mensaje: string | null
  intent_detectado: string | null
  confianza_nlu: number | null
  fecha_hora: string
}

function params(p: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== null),
  )
}

export async function listarInteracciones(query?: {
  prospecto_id?: number
  desde?: string
  hasta?: string
}): Promise<InteraccionChatbot[]> {
  const { data } = await api.get<PaginatedResponse<InteraccionChatbot>>(
    '/interacciones-chatbot',
    { params: params(query ?? {}) },
  )
  return data.data
}

export async function obtenerInteraccion(
  id: number,
): Promise<InteraccionChatbot> {
  const { data } = await api.get<InteraccionChatbot>(
    `/interacciones-chatbot/${id}`,
  )
  return data
}

export interface EstadisticasInteracciones {
  total: number
  confianza_promedio: number
  por_tipo: Array<{ tipo: string; cantidad: number }>
}

export async function estadisticasInteracciones(): Promise<EstadisticasInteracciones> {
  const { data } = await api.get<EstadisticasInteracciones>(
    '/interacciones-chatbot/estadisticas',
  )
  return data
}
