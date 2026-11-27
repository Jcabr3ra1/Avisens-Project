import { api } from '@shared/api/client'
import { esNotFound } from '@shared/utils/errores'
import type { CurvaPlan } from './plan-lote'

export type EstadoCalculoAlimento =
  | 'calculado'
  | 'plan_sin_dia_objetivo'
  | 'sin_consumo_en_curva'
  | 'consumo_insuficiente'
  | 'consumo_fuera_de_rango'

export type EstadoDesgloseAlimento =
  | 'legado_sin_desglose'
  | 'lote_sin_marca_alimento'
  | 'marca_sin_catalogo'
  | 'catalogo_invalido'
  | 'catalogo_ambiguo'
  | 'catalogo_incompleto'
  | 'calculado'

export type MotivoDesactualizacionAlimento =
  | 'plan_cambio'
  | 'sin_plan_vigente'
  | 'cantidad_inicial_cambio'
  | 'algoritmo_cambio'
  | 'mortalidad_cambio'
  | 'mortalidad_actual_incoherente'
  | 'algoritmo_desglose_cambio'
  | 'marca_alimento_cambio'

export interface EntradaMortalidad {
  dia: number
  muertes: number
}

export interface CorteEstimacion {
  dia: number
  cantidad_inicial: number
  muertes: number | null
  aves_vivas: number | null
  mortalidad_por_dia: EntradaMortalidad[]
}

export interface ResultadoEstimacion {
  consumo_por_ave_g: number | null
  consumo_total_kg: number | null
}

export interface RenglonDesglose {
  orden: number
  tipo_alimento_id: number | null
  tipo_alimento_nombre_snapshot: string | null
  etapa: string | null
  dia_inicio: number
  dia_fin: number
  extendido_hasta_dia_objetivo: boolean
  consumo_por_ave_g: number
  consumo_total_kg: number
}

export interface DesgloseAlimento {
  no_disponible: boolean
  estado: EstadoDesgloseAlimento | null
  version: string | null
  marca_alimento_snapshot: string | null
  renglones: RenglonDesglose[]
}

export interface PlanVigenteInfo {
  id: number
  version: number
  dia_objetivo: number | null
  desactualizado: boolean
  es_el_mismo: boolean
}

export interface PlanEstimacion {
  id: number
  version: number
  dia_objetivo: number | null
  fecha_salida_calculada: string | null
  curva: CurvaPlan | null
}

export interface EstimacionAlimentoPlan {
  id: number
  version: number
  vigente: boolean
  estado_alimento: EstadoCalculoAlimento
  version_algoritmo: string
  motivo: string | null
  fecha_creacion: string
  creado_por: { id: number; nombre_completo: string }
  plan: PlanEstimacion
  corte: CorteEstimacion
  resultado: ResultadoEstimacion
  desglose: DesgloseAlimento
  efectiva: boolean
  plan_vigente: PlanVigenteInfo | null
  desactualizado: boolean
  motivos_desactualizacion: MotivoDesactualizacionAlimento[]
  antiguedad_dias: number
}

export type CrearEstimacionAlimentoPayload = { motivo?: string }

// null = el lote todavia no tiene ninguna estimacion (404 de negocio).
export async function obtenerEstimacionAlimento(
  loteId: number,
): Promise<EstimacionAlimentoPlan | null> {
  try {
    const { data } = await api.get<EstimacionAlimentoPlan>(
      `/lotes/${loteId}/plan/alimento`,
    )
    return data
  } catch (error) {
    if (esNotFound(error)) return null
    throw error
  }
}

// Repetir el POST (con o sin motivo) ES el recalculo -- un solo verbo,
// igual que el backend (ver plan-alimento.controller.ts).
export async function crearEstimacionAlimento(
  loteId: number,
  payload: CrearEstimacionAlimentoPayload = {},
): Promise<EstimacionAlimentoPlan> {
  const { data } = await api.post<EstimacionAlimentoPlan>(
    `/lotes/${loteId}/plan/alimento`,
    payload,
  )
  return data
}
