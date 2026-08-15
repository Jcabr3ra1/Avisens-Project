import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Dispositivo {
  id: number
  galpon_id: number
  codigo_topic: string
  nombre: string
  modelo: string | null
  firmware_version: string | null
  activo: boolean
}

export interface CrearDispositivoPayload {
  galpon_id: number
  codigo_topic: string
  nombre: string
  modelo?: string
  firmware_version?: string
}

export type ActualizarDispositivoPayload = Partial<CrearDispositivoPayload> & {
  activo?: boolean
}

export async function listarDispositivos(): Promise<Dispositivo[]> {
  const { data } = await api.get<PaginatedResponse<Dispositivo>>('/dispositivos')
  return data.data
}

export async function obtenerDispositivo(id: number): Promise<Dispositivo> {
  const { data } = await api.get<Dispositivo>(`/dispositivos/${id}`)
  return data
}

export async function crearDispositivo(
  payload: CrearDispositivoPayload,
): Promise<Dispositivo> {
  const { data } = await api.post<Dispositivo>('/dispositivos', payload)
  return data
}

export async function actualizarDispositivo(
  id: number,
  payload: ActualizarDispositivoPayload,
): Promise<Dispositivo> {
  const { data } = await api.patch<Dispositivo>(`/dispositivos/${id}`, payload)
  return data
}

export async function activarDispositivo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/dispositivos/${id}/activar`,
  )
  return data
}

export async function regenerarTokenDispositivo(
  id: number,
): Promise<{ id: number; token_ingesta: string }> {
  const { data } = await api.post<{ id: number; token_ingesta: string }>(
    `/dispositivos/${id}/token`,
  )
  return data
}

export async function desactivarDispositivo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/dispositivos/${id}`,
  )
  return data
}

export async function eliminarDispositivoPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/dispositivos/${id}/permanente`,
  )
  return data
}
