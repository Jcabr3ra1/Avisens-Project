import { api } from './client'
import type { PaginatedResponse } from './types'

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

export async function listarOrganizaciones(
  query: OrganizacionesQuery = {},
): Promise<Organizacion[]> {
  const { data } = await api.get<PaginatedResponse<Organizacion>>(
    '/organizaciones',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}
