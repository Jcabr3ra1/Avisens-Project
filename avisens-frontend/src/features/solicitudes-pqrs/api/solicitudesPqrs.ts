import { api, type PaginatedResponse } from '@shared/api'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type {
  ResponderSolicitudPqrsDto,
  SolicitudPqrs,
  SolicitudesPqrsQuery,
} from '../model/solicitudPqrs'

export async function listarSolicitudesPqrs(
  query: SolicitudesPqrsQuery = {},
): Promise<PaginatedResponse<SolicitudPqrs>> {
  const { data } = await api.get<PaginatedResponse<SolicitudPqrs>>(
    '/solicitudes-pqrs',
    { params: query },
  )

  return data
}

// Trae todas las que cumplan el filtro. El volumen se acota filtrando (por
// estado, por prospecto), nunca limitando filas: los contadores del panel de
// admin y de la propia pantalla se calculan sumando esta lista.
export async function listarTodasLasSolicitudesPqrs(
  query: Omit<SolicitudesPqrsQuery, 'page' | 'limit'> = {},
): Promise<SolicitudPqrs[]> {
  return listarTodasLasPaginas<SolicitudPqrs>('/solicitudes-pqrs', query)
}

export async function listarSolicitudesPqrsDeProspecto(
  prospectoId: number,
): Promise<SolicitudPqrs[]> {
  const { data } = await api.get<SolicitudPqrs[]>(
    `/solicitudes-pqrs/prospecto/${prospectoId}`,
  )

  return data
}

export async function obtenerSolicitudPqrs(
  id: number,
): Promise<SolicitudPqrs> {
  const { data } = await api.get<SolicitudPqrs>(
    `/solicitudes-pqrs/${id}`,
  )

  return data
}

export async function responderSolicitudPqrs(
  id: number,
  respuesta: ResponderSolicitudPqrsDto,
): Promise<SolicitudPqrs> {
  const { data } = await api.patch<SolicitudPqrs>(
    `/solicitudes-pqrs/${id}/responder`,
    respuesta,
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

export interface CrearSolicitudPqrsPayload {
  prospecto_id: number
  categoria: string
  asunto?: string
  mensaje?: string
}

export async function crearSolicitudPqrs(
  payload: CrearSolicitudPqrsPayload,
): Promise<SolicitudPqrs> {
  const { data } = await api.post<SolicitudPqrs>('/solicitudes-pqrs', payload)
  return data
}
