import { api } from './client'
import type { PaginatedResponse } from './types'

export interface EventoSanitario {
  id: number
  lote_id: number
  insumo_id: number | null
  tipo: string
  diagnostico: string | null
  producto: string | null
  dosis: string | null
  via_aplicacion: string | null
  cantidad_aves: number | null
  fecha: string
  metodo_registro: string | null
  observaciones: string | null
}

export interface CrearEventoSanitarioPayload {
  lote_id: number
  tipo: string
  fecha: string
  insumo_id?: number
  diagnostico?: string
  producto?: string
  dosis?: string
  via_aplicacion?: string
  cantidad_aves?: number
  metodo_registro?: string
  observaciones?: string
}

export type ActualizarEventoSanitarioPayload =
  Partial<CrearEventoSanitarioPayload>

export async function listarEventosSanitarios(
  page = 1,
  limit = 20,
): Promise<EventoSanitario[]> {
  const { data } = await api.get<PaginatedResponse<EventoSanitario>>(
    '/eventos-sanitarios',
    { params: { page, limit } },
  )
  return data.data
}

export async function obtenerEventoSanitario(
  id: number,
): Promise<EventoSanitario> {
  const { data } = await api.get<EventoSanitario>(`/eventos-sanitarios/${id}`)
  return data
}

export async function crearEventoSanitario(
  payload: CrearEventoSanitarioPayload,
): Promise<EventoSanitario> {
  const { data } = await api.post<EventoSanitario>(
    '/eventos-sanitarios',
    payload,
  )
  return data
}

export async function actualizarEventoSanitario(
  id: number,
  payload: ActualizarEventoSanitarioPayload,
): Promise<EventoSanitario> {
  const { data } = await api.patch<EventoSanitario>(
    `/eventos-sanitarios/${id}`,
    payload,
  )
  return data
}

export async function eliminarEventoSanitario(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/eventos-sanitarios/${id}`,
  )
  return data
}
