import { api } from './client'
import type { OrganizacionResumen, PaginatedResponse } from './types'

export async function listarOrganizaciones(): Promise<OrganizacionResumen[]> {
  const { data } = await api.get<PaginatedResponse<OrganizacionResumen>>(
    '/organizaciones?limit=100',
  )
  return data.data
}
