import { api } from './client'
import type { PaginatedResponse } from './types'

export interface Lote {
  id: number
  galpon_id: number
  proveedor_id: number
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
  estado: string
  galpon?: { id: number; nombre: string; codigo: string; granja?: { id: number; nombre: string } }
}

export interface CrearLotePayload {
  galpon_id: number
  proveedor_id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  raza?: string
  sexo?: string
  marca_alimento?: string
  costo_pollito_unitario?: number
  presupuesto_total_cop?: number
  fecha_salida_estimada?: string
}

export type ActualizarLotePayload = Partial<CrearLotePayload> & {
  fecha_salida_real?: string
  estado?: string
}

export async function listarLotes(): Promise<Lote[]> {
  const { data } = await api.get<PaginatedResponse<Lote>>('/lotes')
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
