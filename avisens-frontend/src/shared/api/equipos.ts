import { api } from './client'
import type { PaginatedResponse } from './types'

export interface GranjaDeEquipo {
  id: number
  propietario_id: number
}

export interface GalponDeEquipo {
  id: number
  nombre: string
  codigo: string
  granja: GranjaDeEquipo
}

export interface Equipo {
  id: number
  galpon_id: number
  zona_id: number | null
  codigo: string
  nombre: string
  tipo: string | null
  es_actuador: boolean
  modelo: string | null
  fabricante: string | null
  serial: string | null
  fecha_compra: string | null
  fecha_instalacion: string | null
  vida_util_horas: number | null
  horas_operacion: number | null
  estado_actual: string
  modo_operacion: string | null
  coordenada_x: number | null
  coordenada_y: number | null
  costo_cop: number | null
  galpon: GalponDeEquipo
}

export interface CrearEquipoPayload {
  galpon_id: number
  codigo: string
  nombre: string
  tipo?: string
  es_actuador?: boolean
  modelo?: string
  fabricante?: string
  serial?: string
  fecha_compra?: string
  fecha_instalacion?: string
  vida_util_horas?: number
  estado_actual?: string
  modo_operacion?: string
  coordenada_x?: number
  coordenada_y?: number
  costo_cop?: number
}

export type ActualizarEquipoPayload = Partial<CrearEquipoPayload>

export interface EquiposQuery {
  page?: number
  limit?: number
}

export async function listarEquipos(query: EquiposQuery = {}): Promise<Equipo[]> {
  const { data } = await api.get<PaginatedResponse<Equipo>>('/equipos', {
    params: { page: 1, limit: 100, ...query },
  })
  return data.data
}

export async function obtenerEquipo(id: number): Promise<Equipo> {
  const { data } = await api.get<Equipo>(`/equipos/${id}`)
  return data
}

export async function crearEquipo(payload: CrearEquipoPayload): Promise<Equipo> {
  const { data } = await api.post<Equipo>('/equipos', payload)
  return data
}

export async function actualizarEquipo(
  id: number,
  payload: ActualizarEquipoPayload,
): Promise<Equipo> {
  const { data } = await api.patch<Equipo>(`/equipos/${id}`, payload)
  return data
}

export async function eliminarEquipo(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/equipos/${id}`,
  )
  return data
}
