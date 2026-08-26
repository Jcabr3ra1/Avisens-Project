import { api } from './client'
import type { PaginatedResponse } from './types'

export type EstadoRecuperacion =
  | 'pendiente'
  | 'aprobada'
  | 'rechazada'
  | 'completada'

export interface UsuarioRecuperacion {
  id: number
  nombre_completo: string
  email: string
  cedula: string
  activo: boolean
}

export interface RecuperacionPassword {
  id: number
  estado: EstadoRecuperacion
  motivo: string | null
  fecha_creacion: string
  atendida_en: string | null
  observacion: string | null
  usuario: UsuarioRecuperacion
  atendida_por: { id: number; nombre_completo: string } | null
}

export interface AprobacionRecuperacion {
  id: number
  password_temporal: string
  expira_en: string
  aviso: string
}

export interface SolicitarRecuperacionPayload {
  email: string
  motivo?: string
}

export interface ResolverRecuperacionPayload {
  observacion?: string
}

export interface CambiarPasswordTemporalPayload {
  nueva_password: string
}

export interface RecuperacionesQuery {
  page?: number
  limit?: number
}

export async function solicitarRecuperacion(
  payload: SolicitarRecuperacionPayload,
): Promise<{ mensaje: string }> {
  const { data } = await api.post<{ mensaje: string }>(
    '/recuperaciones-password/solicitudes',
    payload,
  )
  return data
}

export async function listarRecuperaciones(
  query: RecuperacionesQuery = {},
): Promise<RecuperacionPassword[]> {
  const { data } = await api.get<PaginatedResponse<RecuperacionPassword>>(
    '/recuperaciones-password',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function aprobarRecuperacion(
  id: number,
  payload: ResolverRecuperacionPayload = {},
): Promise<AprobacionRecuperacion> {
  const { data } = await api.patch<AprobacionRecuperacion>(
    `/recuperaciones-password/${id}/aprobar`,
    payload,
  )
  return data
}

export async function rechazarRecuperacion(
  id: number,
  payload: ResolverRecuperacionPayload = {},
): Promise<RecuperacionPassword> {
  const { data } = await api.patch<RecuperacionPassword>(
    `/recuperaciones-password/${id}/rechazar`,
    payload,
  )
  return data
}

export async function cambiarPasswordTemporal(
  payload: CambiarPasswordTemporalPayload,
): Promise<{ mensaje: string }> {
  const { data } = await api.post<{ mensaje: string }>(
    '/recuperaciones-password/cambiar-password',
    payload,
  )
  return data
}
