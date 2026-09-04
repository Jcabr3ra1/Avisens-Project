export type EstadoRecuperacionPassword =
  | 'pendiente'
  | 'aprobada'
  | 'rechazada'
  | 'completada'

export type RecuperacionPassword = {
  id: number
  estado: EstadoRecuperacionPassword
  motivo: string | null
  fecha_creacion: string
  atendida_en: string | null
  observacion: string | null
  usuario: {
    id: number
    nombre_completo: string
    email: string
    cedula: string
    activo: boolean
  }
  atendida_por: { id: number; nombre_completo: string } | null
}

export type AprobacionRecuperacion = {
  id: number
  password_temporal: string
  expira_en: string
  aviso: string
}

export type SolicitarRecuperacionPayload = {
  email: string
  motivo?: string
}

export type ResolverRecuperacionPayload = {
  observacion?: string
}
