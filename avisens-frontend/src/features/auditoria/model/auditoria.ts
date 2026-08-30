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
  usuario: { nombre_completo: string; email: string } | null
}

export type ListadoAuditoria = {
  registros: RegistroAuditoria[]
  total: number
  pagina: number
  totalPaginas: number
}
