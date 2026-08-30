import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type { ListadoAuditoria, RegistroAuditoria } from '../model/auditoria'

export async function listarAuditoria(
  pagina: number,
  limite: number,
): Promise<ListadoAuditoria> {
  const { data } = await api.get<PaginatedResponse<RegistroAuditoria>>(
    '/auditoria',
    { params: { page: pagina, limit: limite } },
  )
  return {
    registros: data.data,
    total: data.meta.total,
    pagina: data.meta.page,
    totalPaginas: data.meta.totalPages,
  }
}
