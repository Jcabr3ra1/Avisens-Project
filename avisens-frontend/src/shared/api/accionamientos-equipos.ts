import { api } from './client'
import type { PaginatedResponse } from './types'

export type EstadoAccionamiento = 'encendido' | 'apagado'

export interface GranjaDeAccionamiento {
  id: number
  nombre: string
  propietario_id: number
}

export interface GalponDeAccionamiento {
  id: number
  nombre: string
  granja: GranjaDeAccionamiento
}

export interface EquipoDeAccionamiento {
  id: number
  nombre: string
  codigo: string
  tipo: string | null
  es_actuador: boolean
  galpon_id: number
  galpon: GalponDeAccionamiento
}

export interface AccionamientoEquipo {
  id: number
  equipo_id: number
  alerta_id: number | null
  origen: string | null
  estado: EstadoAccionamiento | null
  valor_disparo: number | null
  usuario_id: number | null
  fecha_inicio: string
  fecha_fin: string | null
  equipo: EquipoDeAccionamiento
}

export interface EstadisticasAccionamientos {
  total: number
  activos: number
  cerrados: number
  automaticos: number
  manuales: number
  tasa_automatizacion: number
}

export interface CrearAccionamientoPayload {
  equipo_id: number
  alerta_id?: number
  origen?: string
  estado?: EstadoAccionamiento
  valor_disparo?: number
  fecha_inicio?: string
}

export interface CerrarAccionamientoPayload {
  fecha_fin?: string
  estado?: EstadoAccionamiento
}

export interface AccionamientosQuery {
  page?: number
  limit?: number
}

export async function listarAccionamientos(
  query: AccionamientosQuery = {},
): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    '/accionamientos-equipos',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerAccionamiento(
  id: number,
): Promise<AccionamientoEquipo> {
  const { data } = await api.get<AccionamientoEquipo>(
    `/accionamientos-equipos/${id}`,
  )
  return data
}

export async function listarAccionamientosDeEquipo(
  equipoId: number,
  query: AccionamientosQuery = {},
): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    `/accionamientos-equipos/equipo/${equipoId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function listarAccionamientosDeAlerta(
  alertaId: number,
  query: AccionamientosQuery = {},
): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    `/accionamientos-equipos/alerta/${alertaId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerEstadisticasAccionamientos(): Promise<EstadisticasAccionamientos> {
  const { data } = await api.get<EstadisticasAccionamientos>(
    '/accionamientos-equipos/estadisticas/resumen',
  )
  return data
}

export async function crearAccionamiento(
  payload: CrearAccionamientoPayload,
): Promise<AccionamientoEquipo> {
  const { data } = await api.post<AccionamientoEquipo>(
    '/accionamientos-equipos',
    payload,
  )
  return data
}

export async function cerrarAccionamiento(
  id: number,
  payload: CerrarAccionamientoPayload = {},
): Promise<AccionamientoEquipo> {
  const { data } = await api.patch<AccionamientoEquipo>(
    `/accionamientos-equipos/${id}/cerrar`,
    payload,
  )
  return data
}

export async function eliminarAccionamiento(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/accionamientos-equipos/${id}`,
  )
  return data
}
