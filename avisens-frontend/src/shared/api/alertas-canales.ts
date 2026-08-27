import { api } from './client'
import type { PaginatedResponse } from './types'

export interface GranjaDeCanal {
  id: number
  nombre: string
  propietario_id: number
}

export interface GalponDeCanal {
  id: number
  nombre: string
  granja: GranjaDeCanal
}

export interface AlertaDeCanal {
  id: number
  tipo: string
  criticidad: string
  mensaje: string | null
  estado: string
  galpon: GalponDeCanal
}

export interface AlertaCanal {
  id: number
  alerta_id: number
  canal: string | null
  estado_envio: string | null
  fecha_envio: string | null
  alerta: AlertaDeCanal
}

export interface EstadisticasCanales {
  total: number
  enviados: number
  pendientes: number
  fallidos: number
  tasa_exito: number
}

export interface CrearAlertaCanalPayload {
  alerta_id: number
  canal?: string
  estado_envio?: string
  fecha_envio?: string
}

export interface ActualizarAlertaCanalPayload {
  estado_envio?: string
  fecha_envio?: string
}

export interface AlertasCanalesQuery {
  page?: number
  limit?: number
}

export async function listarAlertasCanales(
  query: AlertasCanalesQuery = {},
): Promise<AlertaCanal[]> {
  const { data } = await api.get<PaginatedResponse<AlertaCanal>>(
    '/alertas-canales',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerAlertaCanal(id: number): Promise<AlertaCanal> {
  const { data } = await api.get<AlertaCanal>(`/alertas-canales/${id}`)
  return data
}

export async function listarCanalesDeAlerta(
  alertaId: number,
  query: AlertasCanalesQuery = {},
): Promise<AlertaCanal[]> {
  const { data } = await api.get<PaginatedResponse<AlertaCanal>>(
    `/alertas-canales/alerta/${alertaId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerEstadisticasCanales(): Promise<EstadisticasCanales> {
  const { data } = await api.get<EstadisticasCanales>(
    '/alertas-canales/estadisticas/resumen',
  )
  return data
}

export async function crearAlertaCanal(
  payload: CrearAlertaCanalPayload,
): Promise<AlertaCanal> {
  const { data } = await api.post<AlertaCanal>('/alertas-canales', payload)
  return data
}

export async function actualizarAlertaCanal(
  id: number,
  payload: ActualizarAlertaCanalPayload,
): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}`, payload)
  return data
}

export async function marcarCanalEnviado(id: number): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/enviado`, {})
  return data
}

export async function marcarCanalFallido(id: number): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/fallido`, {})
  return data
}

export async function actualizarEstadoCanal(
  id: number,
  estado: string,
): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/estado`, {
    estado,
  })
  return data
}

export async function eliminarAlertaCanal(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/alertas-canales/${id}`,
  )
  return data
}
