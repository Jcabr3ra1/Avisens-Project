import { api } from './client'
import type {
  ActualizarSensorPayload,
  CrearSensorPayload,
  PaginatedResponse,
  Sensor,
} from './types'

// Funciones del módulo `sensores` del backend (EP-08).
// Requieren sesión: el Admin gestiona todos; el Propietario, solo los sensores
// de galpones de sus propias granjas (el alcance se aplica en el servidor).

export async function listarSensores(): Promise<Sensor[]> {
  // El backend pagina: { data, meta }. Devolvemos solo el array `data`.
  const { data } = await api.get<PaginatedResponse<Sensor>>('/sensores')
  return data.data
}

export async function obtenerSensor(id: number): Promise<Sensor> {
  const { data } = await api.get<Sensor>(`/sensores/${id}`)
  return data
}

export async function crearSensor(payload: CrearSensorPayload): Promise<Sensor> {
  const { data } = await api.post<Sensor>('/sensores', payload)
  return data
}

export async function actualizarSensor(
  id: number,
  payload: ActualizarSensorPayload,
): Promise<Sensor> {
  const { data } = await api.patch<Sensor>(`/sensores/${id}`, payload)
  return data
}

// Activar: estado → 'activo'.
export async function activarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.patch<{ id: number; estado: string }>(
    `/sensores/${id}/activar`,
  )
  return data
}

// Desactivar: borrado suave, estado → 'inactivo' (conserva el historial).
export async function desactivarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.delete<{ id: number; estado: string }>(
    `/sensores/${id}`,
  )
  return data
}

// Borrado permanente (casos legales). Falla (400) si el sensor tiene mediciones.
export async function eliminarSensor(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/sensores/${id}/permanente`,
  )
  return data
}
