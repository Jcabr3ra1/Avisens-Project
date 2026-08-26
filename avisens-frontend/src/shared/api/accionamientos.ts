import { api } from './client'
import type { PaginatedResponse } from './types'

export interface AccionamientoEquipo {
  id: number
  equipo_id: number
  alerta_id: number | null
  origen: string
  estado: string
  valor_disparo: number | null
  usuario_id: number | null
  fecha_inicio: string
  fecha_fin: string | null
  equipo?: {
    id: number
    nombre: string
    codigo: string
    es_actuador: boolean
  }
}

export interface CrearAccionamientoPayload {
  equipo_id: number
  alerta_id?: number
  origen?: 'manual' | 'automatico' | 'voz' | 'programado'
  estado?: 'encendido' | 'apagado'
  valor_disparo?: number
  fecha_inicio?: string
}

export interface EstadisticasAccionamientos {
  total: number
  activos: number
  cerrados: number
  automaticos: number
  manuales: number
  tasa_automatizacion: number
}

export async function listarAccionamientos(): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    '/accionamientos-equipos',
  )
  return data.data
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

export async function obtenerAccionamiento(
  id: number,
): Promise<AccionamientoEquipo> {
  const { data } = await api.get<AccionamientoEquipo>(
    `/accionamientos-equipos/${id}`,
  )
  return data
}

export async function cerrarAccionamiento(
  id: number,
  payload: { fecha_fin?: string; estado?: 'encendido' | 'apagado' },
): Promise<AccionamientoEquipo & { horas_operacion_agregadas: number }> {
  const { data } = await api.patch<
    AccionamientoEquipo & { horas_operacion_agregadas: number }
  >(`/accionamientos-equipos/${id}/cerrar`, payload)
  return data
}

export async function accionamientosPorEquipo(
  equipoId: number,
): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    `/accionamientos-equipos/equipo/${equipoId}`,
  )
  return data.data
}

export async function accionamientosPorAlerta(
  alertaId: number,
): Promise<AccionamientoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<AccionamientoEquipo>>(
    `/accionamientos-equipos/alerta/${alertaId}`,
  )
  return data.data
}

export async function estadisticasAccionamientos(): Promise<EstadisticasAccionamientos> {
  const { data } = await api.get<EstadisticasAccionamientos>(
    '/accionamientos-equipos/estadisticas/resumen',
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
