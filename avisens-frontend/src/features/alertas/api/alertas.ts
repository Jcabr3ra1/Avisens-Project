import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export type EstadoAlerta = 'abierta' | 'en_proceso' | 'cerrada'

export interface GranjaDeAlerta {
  id: number
  nombre: string
  propietario_id: number
}

export interface GalponDeAlerta {
  id: number
  nombre: string
  codigo: string
  granja: GranjaDeAlerta
}

export interface LoteDeAlerta {
  id: number
  codigo: string
  estado: string
}

export interface SensorDeAlerta {
  id: number
  codigo: string
  tipo: string
}

export interface UsuarioDeAlerta {
  id: number
  nombre_completo: string
  email: string
}

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
  estado: EstadoAlerta
  responsable_id: number | null
  escalado_a_id: number | null
  accion_correctiva: string | null
  fecha_creacion: string
  fecha_aceptacion: string | null
  fecha_cierre: string | null
  galpon: GalponDeAlerta
  lote: LoteDeAlerta | null
  sensor: SensorDeAlerta | null
  responsable: UsuarioDeAlerta | null
  escalado_a: UsuarioDeAlerta | null
}

export interface EstadisticasAlertas {
  total: number
  abiertas: number
  en_proceso: number
  cerradas: number
  criticas: number
  tasa_resolucion: number
}

export interface AlertasQuery {
  page?: number
  limit?: number
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

export interface ActualizarAlertaPayload {
  estado?: EstadoAlerta
  accion_correctiva?: string
  responsable_id?: number | null
  escalado_a_id?: number | null
  fecha_aceptacion?: string
  fecha_cierre?: string
}

export async function listarAlertas(query: AlertasQuery = {}): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>('/alertas', {
    params: { page: 1, limit: 100, ...query },
  })
  return data.data
}

export async function obtenerAlerta(id: number): Promise<Alerta> {
  const { data } = await api.get<Alerta>(`/alertas/${id}`)
  return data
}

export async function listarAlertasDeGalpon(
  galponId: number,
  query: AlertasQuery = {},
): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>(
    `/alertas/galpon/${galponId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function listarAlertasDeLote(
  loteId: number,
  query: AlertasQuery = {},
): Promise<Alerta[]> {
  const { data } = await api.get<PaginatedResponse<Alerta>>(
    `/alertas/lote/${loteId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerEstadisticasAlertas(): Promise<EstadisticasAlertas> {
  const { data } = await api.get<EstadisticasAlertas>('/alertas/estadisticas/resumen')
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

export async function aceptarAlerta(id: number): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/aceptar`, {})
  return data
}

export async function cerrarAlerta(
  id: number,
  accion_correctiva?: string,
): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/cerrar`, {
    accion_correctiva,
  })
  return data
}

export async function escalarAlerta(id: number, usuarioId: number): Promise<Alerta> {
  const { data } = await api.patch<Alerta>(`/alertas/${id}/escalar/${usuarioId}`, {})
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
