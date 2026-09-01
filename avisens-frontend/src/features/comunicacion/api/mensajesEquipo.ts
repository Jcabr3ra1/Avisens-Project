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

export interface ContactoEquipo {
  id: number
  nombre_completo: string
  rol: string
  rol_asignacion: string | null
}

export interface ConversacionPrivadaEquipo {
  id: number
  galpon_id: number
  fecha_creacion: string
  ultimo_mensaje_en: string | null
  participante_uno: { id: number; nombre_completo: string }
  participante_dos: { id: number; nombre_completo: string }
  mensajes: Array<{ contenido: string; fecha_envio: string }>
  _count: { mensajes: number }
}

export interface MensajePrivadoEquipo {
  id: number
  conversacion_id: number
  emisor_id: number
  contenido: string
  fecha_envio: string
  fecha_lectura: string | null
  emisor: { id: number; nombre_completo: string }
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

export async function listarContactosEquipo(galponId: number): Promise<ContactoEquipo[]> {
  const { data } = await api.get<ContactoEquipo[]>(`/mensajes-equipo/galpon/${galponId}/contactos`)
  return data
}

export async function listarConversacionesPrivadas(
  galponId: number,
): Promise<ConversacionPrivadaEquipo[]> {
  const { data } = await api.get<ConversacionPrivadaEquipo[]>(`/mensajes-equipo/galpon/${galponId}/privadas`)
  return data
}

export async function abrirConversacionPrivada(payload: {
  galpon_id: number
  destinatario_id: number
}): Promise<ConversacionPrivadaEquipo> {
  const { data } = await api.post<ConversacionPrivadaEquipo>('/mensajes-equipo/privadas', payload)
  return data
}

export async function listarMensajesPrivados(
  conversacionId: number,
  limit = 50,
): Promise<MensajePrivadoEquipo[]> {
  const { data } = await api.get<PaginatedResponse<MensajePrivadoEquipo>>(
    `/mensajes-equipo/privadas/${conversacionId}/mensajes`,
    { params: { page: 1, limit } },
  )
  return data.data
}

export async function enviarMensajePrivado(
  conversacionId: number,
  contenido: string,
): Promise<MensajePrivadoEquipo> {
  const { data } = await api.post<MensajePrivadoEquipo>(
    `/mensajes-equipo/privadas/${conversacionId}/mensajes`,
    { contenido },
  )
  return data
}

export async function marcarMensajesPrivadosLeidos(
  conversacionId: number,
): Promise<{ conversacion_id: number; marcados: number }> {
  const { data } = await api.patch<{ conversacion_id: number; marcados: number }>(
    `/mensajes-equipo/privadas/${conversacionId}/leidos`,
  )
  return data
}
