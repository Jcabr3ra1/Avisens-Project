import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export type EstadoLote = 'activo' | 'finalizado' | 'inactivo'

export interface Lote {
  id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  raza: string | null
  sexo: string | null
  marca_alimento: string | null
  costo_pollito_unitario: number | null
  presupuesto_total_cop: number | null
  fecha_salida_estimada: string | null
  fecha_salida_real: string | null
  estado: EstadoLote
  galpon: {
    id: number
    nombre: string
    granja: { id: number; nombre: string; propietario_id: number }
  }
  proveedor: { id: number; nombre: string } | null
}

export interface CrearLotePayload {
  galpon_id: number
  proveedor_id?: number
  fecha_ingreso: string
  cantidad_inicial: number
  raza?: string
  sexo?: string
  marca_alimento?: string
  costo_pollito_unitario?: number
  presupuesto_total_cop?: number
  fecha_salida_estimada?: string
}

export type ActualizarLotePayload = Omit<Partial<CrearLotePayload>, 'proveedor_id'> & {
  proveedor_id?: number | null
  fecha_salida_real?: string
  estado?: EstadoLote
}

export async function listarLotes(): Promise<Lote[]> {
  const { data } = await api.get<PaginatedResponse<Lote>>('/lotes', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function obtenerLote(id: number): Promise<Lote> {
  const { data } = await api.get<Lote>(`/lotes/${id}`)
  return data
}

export async function crearLote(payload: CrearLotePayload): Promise<Lote> {
  const { data } = await api.post<Lote>('/lotes', payload)
  return data
}

export async function actualizarLote(
  id: number,
  payload: ActualizarLotePayload,
): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/lotes/${id}`, payload)
  return data
}

export async function activarLote(id: number): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/lotes/${id}/activar`)
  return data
}

export async function desactivarLote(id: number): Promise<Lote> {
  const { data } = await api.delete<Lote>(`/lotes/${id}`)
  return data
}

export async function eliminarLotePermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/lotes/${id}/permanente`,
  )
  return data
}
