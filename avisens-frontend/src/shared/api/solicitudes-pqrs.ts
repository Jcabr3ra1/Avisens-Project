import { api } from './client'
import type { PaginatedResponse } from './types'

export interface ProspectoDeSolicitud {
  id: number
  nombre: string | null
  telefono: string | null
  email: string | null
  canal_origen: string | null
}

export interface ResponsableDeSolicitud {
  id: number
  nombre_completo: string
  email: string
}

export interface SolicitudPqrs {
  id: number
  prospecto_id: number
  categoria: string
  codigo_pregunta: string | null
  asunto: string | null
  mensaje: string | null
  respuesta: string | null
  estado: string
  responsable_id: number | null
  fecha_creacion: string
  fecha_cierre: string | null
  prospecto: ProspectoDeSolicitud
  responsable: ResponsableDeSolicitud | null
}

export interface CrearSolicitudPqrsPayload {
  prospecto_id: number
  categoria: string
  asunto?: string
  mensaje?: string
}

export interface ResponderSolicitudPqrsPayload {
  estado?: string
  respuesta?: string
  responsable_id?: number
}

export interface SolicitudesPqrsQuery {
  estado?: string
  categoria?: string
  page?: number
  limit?: number
}

export async function listarSolicitudesPqrs(
  query: SolicitudesPqrsQuery = {},
): Promise<SolicitudPqrs[]> {
  const { data } = await api.get<PaginatedResponse<SolicitudPqrs>>(
    '/solicitudes-pqrs',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerSolicitudPqrs(id: number): Promise<SolicitudPqrs> {
  const { data } = await api.get<SolicitudPqrs>(`/solicitudes-pqrs/${id}`)
  return data
}

export async function crearSolicitudPqrs(
  payload: CrearSolicitudPqrsPayload,
): Promise<SolicitudPqrs> {
  const { data } = await api.post<SolicitudPqrs>('/solicitudes-pqrs', payload)
  return data
}

export async function responderSolicitudPqrs(
  id: number,
  payload: ResponderSolicitudPqrsPayload,
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
