import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Alerta {
  id: number
  galpon_id: number
  lote_id: number | null
  sensor_id: number | null
  tipo: string
  criticidad: string
  valor_detectado: number | null
  valor_umbral: number | null
  mensaje: string | null
  estado: string
  accion_correctiva: string | null
  responsable_id: number | null
  escalado_a_id: number | null
  fecha_creacion: string
  fecha_aceptacion: string | null
  fecha_cierre: string | null
}

export interface CrearAlertaPayload {
  galpon_id: number
  tipo: string
  criticidad: string
  lote_id?: number
  sensor_id?: number
  valor_detectado?: number
  valor_umbral?: number
  mensaje?: string
}

export type ActualizarAlertaPayload = {
  estado?: 'abierta' | 'en_proceso' | 'cerrada'
  accion_correctiva?: string
  responsable_id?: number
  escalado_a_id?: number
}

function params(p: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== null),
  )
}

export async function listarAlertas(query?: {
  estado?: string
  criticidad?: string
  galpon_id?: number
}): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>('/alertas', {
    params: params(query ?? {}),
  })
  return data.data
}

export async function obtenerAlerta(id: number): Promise<Alerta> {
  const { data } = await api.get<Alerta>(`/alertas/${id}`)
  return data
}

export async function crearAlerta(payload: CrearAlertaPayload): Promise<Alerta> {
  const { data } = await api.post<Alerta>('/alertas', payload)
  return data
}

export async function actualizarAlerta(
  id: number,
  payload: ActualizarAlertaPayload,
): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}`, payload)
  return data
}

export async function aceptarAlerta(
  id: number,
  payload: { responsable_id?: number },
): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/aceptar`, payload)
  return data
}

export async function cerrarAlerta(
  id: number,
  payload: { accion_correctiva?: string },
): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/cerrar`, payload)
  return data
}

export async function escalarAlerta(
  id: number,
  usuarioId: number,
): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/escalar/${usuarioId}`)
  return data
}

export async function eliminarAlerta(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/alertas/${id}`,
  )
  return data
}

export async function alertasPorGalpon(galponId: number): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>(
    `/alertas/galpon/${galponId}`,
  )
  return data.data
}

export async function alertasPorLote(loteId: number): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>(
    `/alertas/lote/${loteId}`,
  )
  return data.data
}

export interface EstadisticasAlertas {
  total: number
  por_estado: Record<string, number>
  por_criticidad: Record<string, number>
}

export async function estadisticasAlertas(): Promise<EstadisticasAlertas> {
  const { data } = await api.get<EstadisticasAlertas>('/alertas/estadisticas/resumen')
  return data
}
