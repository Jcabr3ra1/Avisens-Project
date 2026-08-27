import { api } from './client'
import type { PaginatedResponse } from './types'

export type EstadoProspecto =
  | 'nuevo'
  | 'en_proceso'
  | 'calificado'
  | 'asignado'
  | 'cerrado'
  | 'abandonado'
  | 'cancelado'
  | 'pqrs'
  | 'consulta_atendida'
  | 'sin_consentimiento'

export interface Prospecto {
  id: number
  sesion_id: string
  nombre: string | null
  nombre_granja: string | null
  tipo_documento: string | null
  documento: string | null
  municipio: string | null
  departamento: string | null
  area_granja_m2: number | null
  area_galpon_m2: number | null
  rol_prospecto: string | null
  tipo_produccion: string | null
  telefono: string | null
  email: string | null
  canal_origen: string | null
  contacto_decisor: string | null
  fecha_callback: string | null
  puntaje_total: number | null
  clasificacion: string | null
  accion_siguiente: string | null
  senal_caliente: boolean
  conectividad_limitada: boolean
  estado: EstadoProspecto
  pregunta_actual: string | null
  ultima_pregunta: string | null
  asesor_asignado_id: number | null
  consentimiento_habeas_data: boolean
  fecha_inicio: string
  ultima_actividad: string
  fecha_finalizacion: string | null
}

export interface RespuestaProspecto {
  id: number
  prospecto_id: number
  bloque: string | null
  codigo_pregunta: string | null
  pregunta_texto: string | null
  respuesta_texto: string | null
  puntaje_obtenido: number | null
  fecha_respuesta: string
}

export interface AsesorDeProspecto {
  id: number
  nombre_completo: string
  email: string
}

export type ProspectoDetalle = Prospecto & {
  respuestas: RespuestaProspecto[]
  asesor: AsesorDeProspecto | null
}

export interface ProspectosQuery {
  clasificacion?: string
  estado?: EstadoProspecto
  sin_asignar?: boolean
  page?: number
  limit?: number
}

export async function listarProspectos(
  query: ProspectosQuery = {},
): Promise<PaginatedResponse<Prospecto>> {
  const { data } = await api.get<PaginatedResponse<Prospecto>>('/prospectos', {
    params: { page: 1, limit: 100, ...query },
  })
  return data
}

export async function obtenerProspecto(id: number): Promise<ProspectoDetalle> {
  const { data } = await api.get<ProspectoDetalle>(`/prospectos/${id}`)
  return data
}

export async function asignarAsesor(
  id: number,
  asesorId: number,
): Promise<Prospecto> {
  const { data } = await api.patch<Prospecto>(`/prospectos/${id}/asignar`, {
    asesor_id: asesorId,
  })
  return data
}

export async function exportarProspectosCsv(
  query: ProspectosQuery = {},
): Promise<Blob> {
  const { data } = await api.get('/prospectos/exportar', {
    params: query,
    responseType: 'blob',
  })
  return data as Blob
}
