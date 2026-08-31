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

export type VeredictoCurva = 'mejor_que_objetivo' | 'en_objetivo' | 'peor_que_objetivo'

export interface ComparacionObjetivo {
  dia_curva: number
  marca: string
  sexo: string
  peso_esperado_g: number | null
  fcr_objetivo: number | null
  desvio_peso_pct: number | null
  veredicto_peso: VeredictoCurva | null
  desvio_fcr: number | null
  veredicto_fcr: VeredictoCurva | null
}

export interface ResultadoPrediccion {
  lote_id: number
  pesajes_usados: number
  peso_proyectado_faena_g: number
  dia_faena: number
  mortalidad_proyectada_pct: number | null
  consumo_proyectado_kg: number | null
  fcr_proyectado: number | null
  comparacion_objetivo: ComparacionObjetivo | null
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
