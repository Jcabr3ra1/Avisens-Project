import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface Dispositivo {
  id: number
  mac_address: string
  codigo_topic: string
  nombre: string
  version_firmware: string | null
  estado: string
  ip_local: string | null
  ultima_conexion: string | null
  activo: boolean
  fecha_creacion: string
  // El backend anida la granja — no manda un `galpon_id` plano.
  galpon: { id: number; nombre: string; granja: { id: number; propietario_id: number } }
}

export interface CrearDispositivoPayload {
  galpon_id: number
  mac_address: string
  codigo_topic: string
  nombre: string
  version_firmware?: string
  ip_local?: string
}

export type ActualizarDispositivoPayload = Partial<CrearDispositivoPayload> & {
  activo?: boolean
}

export async function listarDispositivos(): Promise<Dispositivo[]> {
  return listarTodasLasPaginas<Dispositivo>('/dispositivos')
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
