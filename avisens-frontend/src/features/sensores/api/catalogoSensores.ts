import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface CatalogoSensor {
  id: number
  tipo_sensor: string
  nombre: string
  descripcion: string | null
  precio_unitario_cop: number
  cobertura_m2: number | null
  obligatorio: boolean
  activo: boolean
}

export async function listarCatalogoSensores(): Promise<CatalogoSensor[]> {
  const { data } = await api.get<PaginatedResponse<CatalogoSensor>>(
    '/catalogo-sensores',
    { params: { limit: 100 } },
  )
  return data.data
}

export interface CrearCatalogoSensorPayload {
  tipo_sensor: string
  nombre: string
  precio_unitario_cop: number
  descripcion?: string
  cobertura_m2?: number
  obligatorio?: boolean
}

export type ActualizarCatalogoSensorPayload = Partial<CrearCatalogoSensorPayload>

export async function obtenerCatalogoSensor(id: number): Promise<CatalogoSensor> {
  const { data } = await api.get<CatalogoSensor>(`/catalogo-sensores/${id}`)
  return data
}

export async function crearCatalogoSensor(
  payload: CrearCatalogoSensorPayload,
): Promise<CatalogoSensor> {
  const { data } = await api.post<CatalogoSensor>('/catalogo-sensores', payload)
  return data
}

export async function actualizarCatalogoSensor(
  id: number,
  payload: ActualizarCatalogoSensorPayload,
): Promise<CatalogoSensor> {
  const { data } = await api.patch<CatalogoSensor>(`/catalogo-sensores/${id}`, payload)
  return data
}

export async function activarCatalogoSensor(id: number): Promise<CatalogoSensor> {
  const { data } = await api.patch<CatalogoSensor>(`/catalogo-sensores/${id}/activar`)
  return data
}

export async function desactivarCatalogoSensor(id: number): Promise<CatalogoSensor> {
  const { data } = await api.delete<CatalogoSensor>(`/catalogo-sensores/${id}`)
  return data
}
