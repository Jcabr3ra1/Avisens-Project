import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type { GalponResumen } from '@shared/api/types'

export interface DispositivoResumen {
  id: number
  nombre: string
  codigo_topic: string
}

export interface Sensor {
  id: number
  codigo: string
  tipo: string
  unidad_medida: string
  modelo: string | null
  fabricante: string | null
  // Float en el esquema, no Decimal: llegan como número. Ubican al sensor
  // dentro del galpón, y con eso se dibuja el plano.
  coordenada_x: number | null
  coordenada_y: number | null
  altura_metros: number | null
  fecha_instalacion: string | null
  ultima_calibracion: string | null
  proxima_calibracion: string | null
  estado: string
  galpon: GalponResumen
  dispositivo: DispositivoResumen
}

// El sensor guarda galpon_id Y dispositivo_id; el backend valida que el
// dispositivo pertenezca al galpón (coherencia), así que ambos son obligatorios.

export interface CrearSensorPayload {
  galpon_id: number
  dispositivo_id: number
  codigo: string
  tipo: string
  unidad_medida: string
  modelo?: string
  fabricante?: string
}

// En edición todo es opcional; `estado` permite activar/desactivar.

export type ActualizarSensorPayload = Partial<CrearSensorPayload> & {
  estado?: string
}

// Funciones del módulo `sensores` del backend (EP-08).
// Requieren sesión: el Admin gestiona todos; el Propietario, solo los sensores
// de galpones de sus propias granjas (el alcance se aplica en el servidor).

export async function listarSensores(): Promise<Sensor[]> {
  return listarTodasLasPaginas<Sensor>('/sensores')
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
