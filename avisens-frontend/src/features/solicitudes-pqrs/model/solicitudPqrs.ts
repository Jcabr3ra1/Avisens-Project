export type EstadoSolicitudPqrs =
  | 'abierta'
  | 'en_proceso'
  | 'resuelta'
  | 'cerrada'

export type CategoriaSolicitudPqrs =
  | 'Petición'
  | 'Queja'
  | 'Reclamo'
  | 'Sugerencia'
  | 'Felicitación'

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
  prospecto_id: number
  categoria: string
  asunto: string | null
  mensaje: string | null
  respuesta: string | null
  estado: EstadoSolicitudPqrs
  responsable_id: number | null
  fecha_creacion: string
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
