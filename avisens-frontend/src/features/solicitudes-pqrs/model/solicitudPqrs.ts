export type EstadoSolicitudPqrs =
  | 'abierta'
  | 'en_proceso'
  | 'resuelta'
  | 'cerrada'

export const CATEGORIAS_PQRS = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'] as const

export type CategoriaSolicitudPqrs = (typeof CATEGORIAS_PQRS)[number]

export interface ProspectoSolicitudPqrs {
  id: number
  nombre: string | null
  telefono: string | null
  email: string | null
  canal_origen: string | null
}

export interface ResponsableSolicitudPqrs {
  id: number
  nombre_completo: string
  email: string
}

export interface SolicitudPqrs {
  id: number
  radicado: string
  prospecto_id: number
  categoria: string
  asunto: string | null
  mensaje: string | null
  respuesta: string | null
  estado: EstadoSolicitudPqrs
  responsable_id: number | null
  fecha_creacion: string
  fecha_limite: string | null
  fecha_cierre: string | null
  prospecto: ProspectoSolicitudPqrs
  responsable: ResponsableSolicitudPqrs | null
}

export interface SolicitudesPqrsQuery {
  page?: number
  limit?: number
  estado?: EstadoSolicitudPqrs
  categoria?: string
}

export interface ResponderSolicitudPqrsDto {
  estado?: Exclude<EstadoSolicitudPqrs, 'abierta'>
  respuesta?: string
  responsable_id?: number
}

export const ETIQUETAS_ESTADO: Record<EstadoSolicitudPqrs, string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
}
