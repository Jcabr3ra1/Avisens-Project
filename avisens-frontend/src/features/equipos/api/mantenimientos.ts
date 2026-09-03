import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface Mantenimiento {
  id: number
  equipo_id: number
  tipo: string | null
  fecha_programada: string | null
  fecha_ejecucion: string | null
  duracion_horas: number | null
  tecnico_responsable: string | null
  tecnico_id: number | null
  descripcion: string | null
  costo_cop: number | null
  causa_falla: string | null
  tiempo_inactivo_horas: number | null
  estado: string
  evidencia_url: string | null
  observaciones: string | null
  fecha_registro: string
}

export interface MantenimientoRepuesto {
  id: number
  mantenimiento_id: number
  insumo_id: number
  descripcion: string | null
  cantidad: number
  unidad_medida: string
  costo_cop: number | null
  clave_idempotencia: string
  revertido: boolean
  fecha_registro: string
}

export interface CrearMantenimientoPayload {
  equipo_id: number
  fecha_programada: string
  tipo?: string
  tecnico_responsable?: string
  tecnico_id?: number
  descripcion?: string
  costo_cop?: number
  estado?: string
  evidencia_url?: string
  observaciones?: string
  fecha_ejecucion?: string
  duracion_horas?: number
  causa_falla?: string
  tiempo_inactivo_horas?: number
}

export type ActualizarMantenimientoPayload = Partial<CrearMantenimientoPayload>

export interface AgregarRepuestoPayload {
  insumo_id: number
  cantidad: number
  clave_idempotencia: string
  descripcion?: string
  costo_cop?: number
}

export interface MantenimientosQuery {
  page?: number
  limit?: number
}

export async function listarMantenimientos(
  query: MantenimientosQuery = {},
): Promise<Mantenimiento[]> {
  const { data } = await api.get<PaginatedResponse<Mantenimiento>>(
    '/mantenimientos',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerMantenimiento(id: number): Promise<Mantenimiento> {
  const { data } = await api.get<Mantenimiento>(`/mantenimientos/${id}`)
  return data
}

export async function crearMantenimiento(
  payload: CrearMantenimientoPayload,
): Promise<Mantenimiento> {
  const { data } = await api.post<Mantenimiento>('/mantenimientos', payload)
  return data
}

export async function actualizarMantenimiento(
  id: number,
  payload: ActualizarMantenimientoPayload,
): Promise<Mantenimiento> {
  const { data } = await api.patch<Mantenimiento>(`/mantenimientos/${id}`, payload)
  return data
}

export async function listarRepuestosDeMantenimiento(
  id: number,
): Promise<MantenimientoRepuesto[]> {
  const { data } = await api.get<MantenimientoRepuesto[]>(
    `/mantenimientos/${id}/repuestos`,
  )
  return data
}

export async function agregarRepuesto(
  id: number,
  payload: AgregarRepuestoPayload,
): Promise<MantenimientoRepuesto> {
  const { data } = await api.post<MantenimientoRepuesto>(
    `/mantenimientos/${id}/repuestos`,
    payload,
  )
  return data
}

export async function revertirRepuesto(
  id: number,
  repuestoId: number,
): Promise<MantenimientoRepuesto> {
  const { data } = await api.patch<MantenimientoRepuesto>(
    `/mantenimientos/${id}/repuestos/${repuestoId}/revertir`,
    {},
  )
  return data
}

export async function eliminarMantenimiento(
  id: number,
): Promise<{ message: string; id: number }> {
  const { data } = await api.delete<{ message: string; id: number }>(
    `/mantenimientos/${id}`,
  )
  return data
}
