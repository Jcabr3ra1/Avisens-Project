import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Notificacion {
  id: number
  usuario_id: number
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  referencia_tipo: string | null
  referencia_id: number | null
  fecha_creacion: string
}

export interface CrearNotificacionPayload {
  usuario_id: number
  tipo: string
  titulo: string
  mensaje: string
  referencia_tipo?: string
  referencia_id?: number
}

export interface NotificacionesQuery {
  page?: number
  limit?: number
}

export async function listarNotificaciones(
  query: NotificacionesQuery = {},
): Promise<Notificacion[]> {
  const { data } = await api.get<PaginatedResponse<Notificacion>>(
    '/notificaciones',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function contarNotificacionesNoLeidas(): Promise<number> {
  const { data } = await api.get<{ no_leidas: number }>('/notificaciones/no-leidas')
  return data.no_leidas
}

export async function crearNotificacion(
  payload: CrearNotificacionPayload,
): Promise<Notificacion> {
  const { data } = await api.post<Notificacion>('/notificaciones', payload)
  return data
}

export async function marcarNotificacionLeida(id: number): Promise<Notificacion> {
  const { data } = await api.patch<Notificacion>(`/notificaciones/${id}/leer`, {})
  return data
}

export async function marcarTodasLeidas(): Promise<{ mensaje: string }> {
  const { data } = await api.patch<{ mensaje: string }>(
    '/notificaciones/leer-todas',
    {},
  )
  return data
}

export async function eliminarNotificacion(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/notificaciones/${id}`,
  )
  return data
}
