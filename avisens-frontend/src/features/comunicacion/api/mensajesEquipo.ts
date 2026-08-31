import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface MensajeEquipo {
  id: number
  galpon_id: number
  emisor_id: number
  contenido: string
  fecha_envio: string
  fecha_lectura: string | null
  emisor: { id: number; nombre_completo: string }
}

export interface ResumenGalponEquipo {
  galpon_id: number
  galpon: { id: number; nombre: string; codigo: string } | null
  total: number
  sin_leer: number
  ultimo_mensaje: string | null
}

// `emisor_id` no se manda: sale del token. Si viniera del cuerpo, cualquiera
// podría escribir haciéndose pasar por otro.
export interface EnviarMensajePayload {
  galpon_id: number
  contenido: string
}

export async function enviarMensajeEquipo(
  payload: EnviarMensajePayload,
): Promise<MensajeEquipo> {
  const { data } = await api.post<MensajeEquipo>('/mensajes-equipo', payload)
  return data
}

// Array plano, sin paginar, ya ordenado por el mensaje más reciente.
export async function obtenerResumenEquipo(): Promise<ResumenGalponEquipo[]> {
  const { data } = await api.get<ResumenGalponEquipo[]>('/mensajes-equipo/resumen')
  return data
}

// El backend responde del más reciente al más antiguo.
export async function listarMensajesDeGalpon(
  galponId: number,
  limit = 50,
): Promise<MensajeEquipo[]> {
  const { data } = await api.get<PaginatedResponse<MensajeEquipo>>(
    `/mensajes-equipo/galpon/${galponId}`,
    { params: { page: 1, limit } },
  )
  return data.data
}

// No marca los propios: `marcados` en 0 cuando solo hay mensajes tuyos.
export async function marcarLeidosDeGalpon(
  galponId: number,
): Promise<{ galpon_id: number; marcados: number }> {
  const { data } = await api.patch<{ galpon_id: number; marcados: number }>(
    `/mensajes-equipo/galpon/${galponId}/leidos`,
  )
  return data
}

// Solo lo propio: 403 si el mensaje es de otro, incluso siendo administrador.
export async function eliminarMensajeEquipo(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/mensajes-equipo/${id}`,
  )
  return data
}
