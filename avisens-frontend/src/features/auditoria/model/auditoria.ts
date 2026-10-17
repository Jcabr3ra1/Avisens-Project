export type RegistroAuditoria = {
  id: number
  usuario_id: number | null
  accion: string
  entidad_afectada: string
  registro_id: number | null
  datos_antes: unknown
  datos_despues: unknown
  ip_origen: string | null
  user_agent: string | null
  fecha_hora: string
  usuario: { nombre_completo: string; email: string | null } | null
}

export type ListadoAuditoria = {
  registros: RegistroAuditoria[]
  total: number
  pagina: number
  totalPaginas: number
}

export type FiltrosAuditoria = {
  accion?: string
  entidad?: string
  usuario_id?: number
  desde?: string
  hasta?: string
}

export type OpcionesAuditoria = {
  acciones: string[]
  entidades: string[]
  usuarios: Array<{ id: number; nombre_completo: string }>
}

export function hayFiltros(filtros: FiltrosAuditoria): boolean {
  return Object.values(filtros).some((valor) => valor !== undefined && valor !== '')
}

export function rangoValido(filtros: FiltrosAuditoria): boolean {
  return !filtros.desde || !filtros.hasta || filtros.desde <= filtros.hasta
}
