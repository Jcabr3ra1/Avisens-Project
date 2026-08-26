import { api } from './client'
export type EstadoRecomendacion = 'pendiente' | 'resuelta'

export interface Recomendacion {
  id: number
  lote_id: number | null
  galpon_id: number | null
  prediccion_id: number | null
  tipo: string | null
  titulo: string
  descripcion: string | null
  accion_sugerida: string | null
  prioridad: string
  estado: EstadoRecomendacion
  usuario_id: number | null
  fecha_generacion: string
  fecha_resolucion: string | null
}

export interface RecomendacionesQuery {
  estado?: string
  page?: number
  limit?: number
}

export interface RecomendacionesGeneradas {
  lote_id: number
  generadas: number
  recomendaciones: Recomendacion[]
}

export async function listarRecomendaciones(
  loteId: number,
  query: RecomendacionesQuery = {},
): Promise<Recomendacion[]> {
  const { data } = await api.get<Recomendacion[]>(`/recomendaciones/${loteId}`, {
    params: query,
  })
  return data
}

export async function generarRecomendaciones(
  loteId: number,
): Promise<RecomendacionesGeneradas> {
  const { data } = await api.post<RecomendacionesGeneradas>(
    `/recomendaciones/generar/${loteId}`,
    {},
  )
  return data
}

export async function resolverRecomendacion(id: number): Promise<Recomendacion> {
  const { data } = await api.patch<Recomendacion>(
    `/recomendaciones/${id}/resolver`,
    {},
  )
  return data
}
