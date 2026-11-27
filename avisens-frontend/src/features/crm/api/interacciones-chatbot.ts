import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface ProspectoDeInteraccion {
  id: number
  nombre: string | null
  telefono: string | null
  canal_origen: string | null
}

export interface InteraccionChatbot {
  id: number
  prospecto_id: number
  tipo: string | null
  mensaje: string | null
  intent_detectado: string | null
  confianza_nlu: number | null
  fecha_hora: string
  prospecto: ProspectoDeInteraccion
}

export interface EstadisticasInteracciones {
  total: number
  confianza_promedio: number
  por_tipo: { tipo: string; cantidad: number }[]
}

export interface CrearInteraccionPayload {
  prospecto_id: number
  tipo?: string
  mensaje?: string
  intent_detectado?: string
  confianza_nlu?: number
}

export interface InteraccionesQuery {
  prospecto_id?: number
  desde?: string
  hasta?: string
  page?: number
  limit?: number
}

export async function listarInteracciones(
  query: InteraccionesQuery = {},
): Promise<InteraccionChatbot[]> {
  const { data } = await api.get<PaginatedResponse<InteraccionChatbot>>(
    '/interacciones-chatbot',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerInteraccion(id: number): Promise<InteraccionChatbot> {
  const { data } = await api.get<InteraccionChatbot>(`/interacciones-chatbot/${id}`)
  return data
}

export async function obtenerEstadisticasInteracciones(): Promise<EstadisticasInteracciones> {
  const { data } = await api.get<EstadisticasInteracciones>(
    '/interacciones-chatbot/estadisticas',
  )
  return data
}

export async function crearInteraccion(
  payload: CrearInteraccionPayload,
): Promise<InteraccionChatbot> {
  const { data } = await api.post<InteraccionChatbot>(
    '/interacciones-chatbot',
    payload,
  )
  return data
}
