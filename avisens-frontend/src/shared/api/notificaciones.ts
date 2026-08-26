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

function params(p: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== null),
  )
}

export async function listarNotificaciones(query?: {
  page?: number
  limit?: number
}): Promise<Notificacion[]> {
  const { data } = await api.get<PaginatedResponse<Notificacion>>(
    '/notificaciones',
    { params: params(query ?? {}) },
  )
  return data.data
}

export async function contarNoLeidas(): Promise<{ no_leidas: number }> {
  const { data } = await api.get<{ no_leidas: number }>(
    '/notificaciones/no-leidas',
  )
  return data
}

export async function crearNotificacion(payload: {
  usuario_id: number
  tipo: string
  titulo: string
  mensaje: string
  referencia_tipo?: string
  referencia_id?: number
}): Promise<Notificacion> {
  const { data } = await api.post<Notificacion>('/notificaciones', payload)
  return data
}

export async function marcarLeida(id: number): Promise<Notificacion> {
  const { data } = await api.patch<Notificacion>(`/notificaciones/${id}/leer`)
  return data
}

export async function marcarTodasLeidas(): Promise<{ mensaje: string }> {
  const { data } = await api.patch<{ mensaje: string }>(
    '/notificaciones/leer-todas',
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
