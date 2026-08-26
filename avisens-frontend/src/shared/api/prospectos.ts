import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Prospecto {
  id: number
  nombre: string | null
  nombre_granja: string | null
  telefono: string | null
  municipio: string | null
  canal_origen: string | null
  puntaje_total: number | null
  clasificacion: string | null
  estado: string
  asesor_asignado_id: number | null
  fecha_inicio: string
  fecha_finalizacion: string | null
}

export interface RespuestaProspecto {
  codigo_pregunta: string | null
  pregunta_texto: string | null
  respuesta_texto: string | null
  puntaje_obtenido: number | null
}

export function params(p: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== null),
  )
}

export async function listarProspectos(query?: {
  clasificacion?: string
  estado?: string
  sin_asignar?: boolean
}): Promise<Prospecto[]> {
  const { data } = await api.get<PaginatedResponse<Prospecto>>('/prospectos', {
    params: params(query ?? {}),
  })
  return data.data
}

export async function obtenerProspecto(
  id: number,
): Promise<Prospecto & { respuestas: RespuestaProspecto[] }> {
  const { data } = await api.get<
    Prospecto & { respuestas: RespuestaProspecto[] }
  >(`/prospectos/${id}`)
  return data
}

export async function exportarProspectosCsv(query?: {
  clasificacion?: string
  estado?: string
  sin_asignar?: boolean
}): Promise<string> {
  const { data } = await api.get<string>('/prospectos/exportar', {
    params: params(query ?? {}),
    responseType: 'text',
  })
  return data
}

export async function asignarAsesor(
  prospectoId: number,
  adminId: number,
): Promise<{ prospecto_id: number; admin: string; estado: string }> {
  const { data } = await api.patch(`/prospectos/${prospectoId}/asignar`, {
    admin_id: adminId,
  })
  return data
}
