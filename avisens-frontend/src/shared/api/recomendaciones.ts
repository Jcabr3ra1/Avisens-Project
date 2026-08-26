import { api } from './client'

export interface Recomendacion {
  id: number
  lote_id: number
  categoria: string
  severidad: string
  titulo: string
  detalle: string
  estado: string
  fecha_generacion: string
}

export async function generarRecomendaciones(
  loteId: number,
): Promise<Recomendacion[]> {
  const { data } = await api.post<Recomendacion[]>(
    `/recomendaciones/generar/${loteId}`,
  )
  return data
}

export async function listarRecomendaciones(
  loteId: number,
): Promise<Recomendacion[]> {
  const { data } = await api.get<Recomendacion[]>(`/recomendaciones/${loteId}`)
  return data
}

export async function resolverRecomendacion(
  id: number,
): Promise<Recomendacion> {
  const { data } = await api.patch<Recomendacion>(`/recomendaciones/${id}/resolver`)
  return data
}
