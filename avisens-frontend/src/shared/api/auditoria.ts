import { api } from './client'
import type { PaginatedResponse } from './types'

export interface RegistroAuditoria {
  id: number
  usuario_id: number | null
  accion: string
  entidad: string
  entidad_id: number | null
  cambios: unknown
  ip: string | null
  fecha: string
}

export async function listarAuditoria(
  page = 1,
  limit = 20,
): Promise<RegistroAuditoria[]> {
  const { data } = await api.get<PaginatedResponse<RegistroAuditoria>>(
    '/auditoria',
    { params: { page, limit } },
  )
  return data.data
}
