import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface Organizacion {
  id: number
  nombre: string
  nit: string | null
  plan: string
  activa: boolean
  fecha_creacion: string
}

export interface OrganizacionesQuery {
  page?: number
  limit?: number
}

export interface CrearOrganizacionPayload {
  nombre: string
  nit?: string
  plan?: string
}

export async function listarOrganizaciones(
  query: OrganizacionesQuery = {},
): Promise<Organizacion[]> {
  const { data } = await api.get<PaginatedResponse<Organizacion>>(
    '/organizaciones',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function crearOrganizacion(
  payload: CrearOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.post<Organizacion>('/organizaciones', payload)
  return data
}

export type ActualizarOrganizacionPayload = Partial<CrearOrganizacionPayload> & {
  activa?: boolean
}

export async function obtenerOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.get<Organizacion>(`/organizaciones/${id}`)
  return data
}

export async function actualizarOrganizacion(
  id: number,
  payload: ActualizarOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}`, payload)
  return data
}

export async function activarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}/activar`)
  return data
}

// Baja lógica: conserva la organización y todo lo que cuelga de ella.
export async function desactivarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.delete<Organizacion>(`/organizaciones/${id}`)
  return data
}
