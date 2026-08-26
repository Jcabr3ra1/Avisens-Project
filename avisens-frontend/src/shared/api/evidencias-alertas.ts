import { api } from './client'
import type { PaginatedResponse } from './types'

export interface EvidenciaAlerta {
  id: number
  alerta_id: number
  tipo_evidencia: string | null
  archivo_url: string | null
  comentario: string | null
  tamano_bytes: number | null
}

export interface CrearEvidenciaAlertaPayload {
  alerta_id: number
  tipo_evidencia?: string
  archivo_url?: string
  comentario?: string
  tamano_bytes?: number
}

export async function listarEvidencias(): Promise<EvidenciaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<EvidenciaAlerta>>(
    '/evidencias-alerta',
  )
  return data.data
}

export async function evidenciasPorAlerta(
  alertaId: number,
): Promise<EvidenciaAlerta[]> {
  const { data } = await api.get<PaginatedResponse<EvidenciaAlerta>>(
    `/evidencias-alerta/alerta/${alertaId}`,
  )
  return data.data
}

export async function crearEvidenciaAlerta(
  payload: CrearEvidenciaAlertaPayload,
): Promise<EvidenciaAlerta> {
  const { data } = await api.post<EvidenciaAlerta>(
    '/evidencias-alerta',
    payload,
  )
  return data
}

export async function actualizarEvidenciaAlerta(
  id: number,
  payload: Partial<CrearEvidenciaAlertaPayload>,
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
