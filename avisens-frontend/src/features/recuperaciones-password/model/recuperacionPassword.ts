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
    username: string
    email: string | null
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
  username: string
  motivo?: string
}

export type ResolverRecuperacionPayload = {
  observacion?: string
}

export const ETIQUETAS_ESTADO_RECUPERACION: Record<EstadoRecuperacionPassword, string> = {
  pendiente: 'Por revisar',
  aprobada: 'Acceso temporal',
  rechazada: 'Rechazada',
  completada: 'Completada',
}
