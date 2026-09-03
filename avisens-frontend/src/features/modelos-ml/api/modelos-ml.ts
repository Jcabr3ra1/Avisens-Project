import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface ModeloMl {
  id: number
  nombre: string
  tipo: string | null
  objetivo: string | null
  version: string | null
  framework: string | null
  metricas: Record<string, unknown> | null
  fecha_entrenamiento: string | null
  activo: boolean
}

export interface CrearModeloMlPayload {
  nombre: string
  tipo?: string
  objetivo?: string
  version?: string
  framework?: string
  metricas?: Record<string, unknown>
  fecha_entrenamiento?: string
}

export type ActualizarModeloMlPayload = Partial<CrearModeloMlPayload> & { activo?: boolean }

export async function listarModelosMl(): Promise<ModeloMl[]> {
  const { data } = await api.get<PaginatedResponse<ModeloMl>>('/modelos-ml', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function obtenerModeloMl(id: number): Promise<ModeloMl> {
  const { data } = await api.get<ModeloMl>(`/modelos-ml/${id}`)
  return data
}

export async function crearModeloMl(payload: CrearModeloMlPayload): Promise<ModeloMl> {
  const { data } = await api.post<ModeloMl>('/modelos-ml', payload)
  return data
}

export async function actualizarModeloMl(
  id: number,
  payload: ActualizarModeloMlPayload,
): Promise<ModeloMl> {
  const { data } = await api.patch<ModeloMl>(`/modelos-ml/${id}`, payload)
  return data
}

export async function eliminarModeloMl(id: number): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(`/modelos-ml/${id}`)
  return data
}
