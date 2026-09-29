import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface Prediccion {
  id: number
  lote_id: number | null
  modelo_id: number | null
  tipo: string
  horizonte_dias: number | null
  valor_predicho: number | null
  unidad: string | null
  confianza: number | null
  fecha_objetivo: string | null
  fecha_generacion: string
}

export interface LlegadaProyectada {
  dia_vida: number
  fecha: string
}

export interface ResultadoPrediccion {
  lote_id: number
  pesajes_usados: number
  peso_proyectado_faena_g: number
  dia_faena: number
  peso_objetivo_g: number
  plan_lote_id: number
  plan_version: number
  mortalidad_proyectada_pct: number | null
  consumo_proyectado_kg: number | null
  fcr_proyectado: number | null
  // El plan usa la curva genetica (linea+sexo); ComparacionObjetivo compara
  // contra curvas_objetivo por marca -- son referencias distintas que no se
  // combinan hasta resolver N3/N4, por eso queda en null con un motivo.
  comparacion_objetivo: null
  comparacion_objetivo_motivo: string
  llegada_proyectada: LlegadaProyectada | null
  predicciones_guardadas: Prediccion[] | null
}

export interface HistorialPrediccionesQuery {
  tipo?: string
  page?: number
  limit?: number
}

export async function predecirLote(loteId: number): Promise<ResultadoPrediccion> {
  const { data } = await api.get<ResultadoPrediccion>(`/predicciones/${loteId}`)
  return data
}

export async function generarPrediccion(
  loteId: number,
): Promise<ResultadoPrediccion> {
  const { data } = await api.post<ResultadoPrediccion>(
    `/predicciones/lote/${loteId}`,
    {},
  )
  return data
}

export async function historialPredicciones(
  loteId: number,
  query: HistorialPrediccionesQuery = {},
): Promise<Prediccion[]> {
  const { data } = await api.get<PaginatedResponse<Prediccion>>(
    `/predicciones/lote/${loteId}/historial`,
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}
