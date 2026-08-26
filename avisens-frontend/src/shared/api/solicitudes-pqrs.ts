import { api } from './client'
import type { PaginatedResponse } from './types'

export interface SolicitudPqrs {
  id: number
  prospecto_id: number
  categoria: string
  asunto: string | null
  mensaje: string | null
  respuesta: string | null
  estado: string
  responsable_id: number | null
  fecha_creacion: string
  fecha_cierre: string | null
  prospecto?: {
    id: number
    nombre: string | null
    telefono: string | null
    email: string | null
    canal_origen: string | null
  }
}

function params(p: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== null),
  )
}

export async function listarSolicitudesPqrs(query?: {
  estado?: string
  categoria?: string
}): Promise<SolicitudPqrs[]> {
  const { data } = await api.get<PaginatedResponse<SolicitudPqrs>>(
    '/solicitudes-pqrs',
    { params: params(query ?? {}) },
  )
  return data.data
}

export async function obtenerSolicitudPqrs(id: number): Promise<SolicitudPqrs> {
  const { data } = await api.get<SolicitudPqrs>(`/solicitudes-pqrs/${id}`)
  return data
}

export async function responderSolicitudPqrs(
  id: number,
  payload: { estado?: 'en_proceso' | 'resuelta' | 'cerrada'; respuesta?: string; responsable_id?: number },
): Promise<SolicitudPqrs> {
  const { data } = await api.patch<SolicitudPqrs>(
    `/solicitudes-pqrs/${id}/responder`,
    payload,
  )
  return data
}

export async function eliminarSolicitudPqrs(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/solicitudes-pqrs/${id}`,
  )
  return data
}
