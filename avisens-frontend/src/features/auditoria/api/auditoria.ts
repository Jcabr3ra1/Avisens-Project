import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type { FiltrosAuditoria, ListadoAuditoria, OpcionesAuditoria, RegistroAuditoria } from '../model/auditoria'

export async function listarAuditoria(
  pagina: number,
  limite: number,
  filtros: FiltrosAuditoria = {},
): Promise<ListadoAuditoria> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== ''))
  const { data } = await api.get<PaginatedResponse<RegistroAuditoria>>(
    '/auditoria',
    { params: { page: pagina, limit: limite, ...params } },
  )
  return {
    registros: data.data,
    total: data.meta.total,
    pagina: data.meta.page,
    totalPaginas: data.meta.totalPages,
  }
}

export async function opcionesAuditoria(): Promise<OpcionesAuditoria> {
  const { data } = await api.get<OpcionesAuditoria>('/auditoria/opciones')
  return data
}
