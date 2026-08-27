import { api } from './client'
import type { PaginatedResponse } from './types'

export interface UsuarioDeEvidencia {
  id: number
  nombre_completo: string
  email: string
}

export interface AlertaDeEvidencia {
  id: number
  tipo: string
  estado: string
  galpon: { granja: { propietario_id: number } }
}

export interface EvidenciaAlerta {
  id: number
  alerta_id: number
  tipo_evidencia: string | null
  archivo_url: string | null
  comentario: string | null
  usuario_id: number | null
  tamano_bytes: number | null
  fecha_subida: string
  usuario: UsuarioDeEvidencia | null
  alerta: AlertaDeEvidencia
}

export interface CrearEvidenciaAlertaPayload {
  alerta_id: number
  tipo_evidencia?: string
  archivo_url?: string
  comentario?: string
  tamano_bytes?: number
}

export type ActualizarEvidenciaAlertaPayload =
  Partial<CrearEvidenciaAlertaPayload>

export interface EvidenciasAlertaQuery {
  page?: number
  limit?: number
}

export async function listarEvidenciasAlerta(
  query: EvidenciasAlertaQuery = {},
): Promise<EvidenciaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<EvidenciaAlerta>>(
    '/evidencias-alerta',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function listarEvidenciasDeAlerta(
  alertaId: number,
  query: EvidenciasAlertaQuery = {},
): Promise<EvidenciaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<EvidenciaAlerta>>(
    `/evidencias-alerta/alerta/${alertaId}`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerEvidenciaAlerta(id: number): Promise<EvidenciaAlerta> {
  const { data } = await api.get<EvidenciaAlerta>(`/evidencias-alerta/${id}`)
  return data
}

export async function crearEvidenciaAlerta(
  payload: CrearEvidenciaAlertaPayload,
): Promise<EvidenciaAlerta> {
  const { data } = await api.post<EvidenciaAlerta>('/evidencias-alerta', payload)
  return data
}

export async function actualizarEvidenciaAlerta(
  id: number,
  payload: ActualizarEvidenciaAlertaPayload,
): Promise<EvidenciaAlerta> {
  const { data } = await api.patch<EvidenciaAlerta>(
    `/evidencias-alerta/${id}`,
    payload,
  )
  return data
}

export async function eliminarEvidenciaAlerta(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/evidencias-alerta/${id}`,
  )
  return data
}
