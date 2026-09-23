import { api } from '@shared/api/client'
import { esNotFound } from '@shared/utils/errores'
import type { LineaGenetica } from './lineas-geneticas'

export type EstadoCalculoPlan =
  | 'calculado'
  | 'sin_curva'
  | 'fuera_de_rango'
  | 'datos_insuficientes'

export type LineaGeneticaResumen = Pick<LineaGenetica, 'id' | 'codigo' | 'nombre'>

export interface SnapshotPlan {
  linea_genetica: LineaGeneticaResumen | null
  sexo_curva: string
  fecha_ingreso: string
}

export interface CurvaPlan {
  version_id: number
  linea_genetica: LineaGeneticaResumen
  sexo: string
  version: number
  fuente: string
}

export interface ResultadoCalculoPlan {
  dia_objetivo: number | null
  dia_objetivo_interpolado: number | null
  fecha_salida_calculada: string | null
}

export interface PlanLote {
  id: number
  lote_id: number
  version: number
  vigente: boolean
  peso_objetivo_g: number
  estado_dia: EstadoCalculoPlan
  motivo: string | null
  fecha_creacion: string
  creado_por: { id: number; nombre_completo: string }
  snapshot: SnapshotPlan
  curva: CurvaPlan | null
  resultado: ResultadoCalculoPlan
  desactualizado: boolean
}

export interface CrearPlanLotePayload {
  peso_objetivo_g: number
  motivo?: string
}

export type RecalcularPlanLotePayload = { motivo?: string }

// null = el lote todavia no tiene plan (404 de negocio, no un error).
export async function obtenerPlanLote(loteId: number): Promise<PlanLote | null> {
  try {
    const { data } = await api.get<PlanLote>(`/lotes/${loteId}/plan`)
    return data
  } catch (error) {
    if (esNotFound(error)) return null
    throw error
  }
}

export async function crearPlanLote(
  loteId: number,
  payload: CrearPlanLotePayload,
): Promise<PlanLote> {
  const { data } = await api.post<PlanLote>(`/lotes/${loteId}/plan`, payload)
  return data
}

export async function recalcularPlanLote(
  loteId: number,
  payload: RecalcularPlanLotePayload = {},
): Promise<PlanLote> {
  const { data } = await api.post<PlanLote>(`/lotes/${loteId}/plan/recalcular`, payload)
  return data
}
