import { api } from './client'
import type { PaginatedResponse } from './types'

export interface AlertaCanal {
  id: number
  alerta_id: number
  canal: string
  destino: string | null
  estado_envio: string | null
  fecha_envio: string | null
}

export interface CrearAlertaCanalPayload {
  alerta_id: number
  canal: string
  destino?: string
}

export async function listarAlertasCanales(): Promise<AlertaCanal[]> {
  const { data } = await api.get<PaginatedResponse<AlertaCanal>>('/alertas-canales')
  return data.data
}

export async function crearAlertaCanal(
  payload: CrearAlertaCanalPayload,
): Promise<AlertaCanal> {
  const { data } = await api.post<AlertaCanal>('/alertas-canales', payload)
  return data
}

export async function alertasCanalesPorAlerta(
  alertaId: number,
): Promise<AlertaCanal[]> {
  const { data } = await api.get<PaginatedResponse<AlertaCanal>>(
    `/alertas-canales/alerta/${alertaId}`,
  )
  return data.data
}

export async function marcarEnviado(id: number): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/enviado`)
  return data
}

export async function marcarFallido(id: number): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/fallido`)
  return data
}

export async function actualizarEstadoEnvio(
  id: number,
  estado: string,
): Promise<AlertaCanal> {
  const { data } = await api.patch<AlertaCanal>(`/alertas-canales/${id}/estado`, {
    estado_envio: estado,
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
