import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import { esNotFound } from '@shared/utils/errores'

export type LineaGenetica = {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
}

export type PuntoCurvaGenetica = {
  id: number
  dia: number
  peso_esperado_g: number
  consumo_diario_g: number | null
  consumo_acumulado_g: number | null
  fcr_objetivo: number | null
}

export type CurvaGeneticaResumen = {
  id: number
  linea_genetica_id: number
  sexo: 'macho' | 'hembra' | 'mixto'
  version: number
  estado: 'borrador' | 'publicada'
  vigente: boolean
  fuente: string
  fecha_publicacion: string | null
  publicada_por_id: number | null
  fecha_creacion: string
}

export type CurvaGenetica = CurvaGeneticaResumen & {
  puntos: PuntoCurvaGenetica[]
}

export type LoteGuia = {
  id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  sexo: 'macho' | 'hembra' | 'mixto' | null
  estado: 'activo' | 'finalizado' | 'inactivo'
  galpon: { id: number; nombre: string; granja: { id: number; nombre: string } }
  linea_genetica: { id: number; codigo: string; nombre: string } | null
}

export type IndicadorLote = {
  id: number
  lote_id: number
  fecha: string
  dia_vida: number | null
  peso_promedio_g: number | null
  fcr: number | null
  consumo_acumulado_g: number | null
  estado_calculo: string
  revision_calculo: number
  estado_peso: string
  pesaje_fecha_snapshot: string | null
}

export type ComparacionLote = {
  dia_vida: number
  dia_curva: number | null
  veredicto: string
  real: { peso_promedio_g: number | null; fcr: number | null }
  objetivo: { peso_esperado_g: number | null; fcr_objetivo: number | null }
  desvio_peso_pct: number | null
  desvio_fcr: number | null
}

export type EstadoCalculoPlan =
  | 'calculado'
  | 'sin_curva'
  | 'fuera_de_rango'
  | 'datos_insuficientes'

export type SituacionCrianza =
  | 'sin_dia_objetivo'
  | 'no_iniciado'
  | 'en_curso'
  | 'objetivo_hoy'
  | 'objetivo_superado'

export type ResumenLineaGeneticaPlan = {
  id: number
  codigo: string
  nombre: string
}

export type PlanLoteGuia = {
  id: number
  lote_id: number
  version: number
  vigente: boolean
  peso_objetivo_g: number
  estado_dia: EstadoCalculoPlan
  motivo: string | null
  fecha_creacion: string
  creado_por: { id: number; nombre_completo: string }
  snapshot: {
    linea_genetica: ResumenLineaGeneticaPlan | null
    sexo_curva: 'macho' | 'hembra' | 'mixto'
    fecha_ingreso: string
  }
  curva: {
    version_id: number
    linea_genetica: ResumenLineaGeneticaPlan
    sexo: 'macho' | 'hembra' | 'mixto'
    version: number
    fuente: string
  } | null
  resultado: {
    dia_objetivo: number | null
    dia_objetivo_interpolado: number | null
    fecha_salida_calculada: string | null
  }
  desactualizado: boolean
  tiempo: {
    plan_version: number
    situacion: SituacionCrianza
    dia_actual: number
    dia_objetivo: number | null
    fecha_estimada: string | null
    dias_restantes: number | null
    dias_sobre_objetivo: number | null
  }
}

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

export type PlanAlimentoGuia = {
  id: number
  version: number
  vigente: boolean
  estado_alimento: EstadoCalculoAlimento
  version_algoritmo: string
  motivo: string | null
  fecha_creacion: string
  creado_por: { id: number; nombre_completo: string }
  plan: {
    id: number
    version: number
    dia_objetivo: number | null
    fecha_salida_calculada: string | null
    curva: PlanLoteGuia['curva']
  }
  corte: {
    dia: number
    cantidad_inicial: number
    muertes: number | null
    aves_vivas: number | null
    mortalidad_por_dia: Array<{ dia: number; muertes: number }>
  }
  resultado: {
    consumo_por_ave_g: number | null
    consumo_total_kg: number | null
  }
  desglose: {
    no_disponible: boolean
    estado: EstadoDesgloseAlimento | null
    version: string | null
    marca_alimento_snapshot: string | null
    renglones: Array<{
      orden: number
      tipo_alimento_id: number | null
      tipo_alimento_nombre_snapshot: string | null
      etapa: string | null
      dia_inicio: number
      dia_fin: number
      extendido_hasta_dia_objetivo: boolean
      consumo_por_ave_g: number
      consumo_total_kg: number
    }>
  }
  efectiva: boolean
  plan_vigente: {
    id: number
    version: number
    dia_objetivo: number | null
    desactualizado: boolean
    es_el_mismo: boolean
    tiempo: PlanLoteGuia['tiempo']
  } | null
  desactualizado: boolean
  motivos_desactualizacion: MotivoDesactualizacionAlimento[]
  antiguedad_dias: number
  alimento_estimado: {
    disponible: boolean
    motivo_no_disponible: string | null
    base: {
      estimacion_version: number
      plan_version: number
      dia_corte: number
      calculada_el: string
      antiguedad_dias: number
      corte_es_hoy: boolean
      corresponde_al_plan_vigente: boolean
    }
    total_kg: string | null
    hasta_corte_kg: string | null
    pendiente_tras_corte_kg: string | null
    pendiente_desde_hoy_kg: string | null
    requiere_recalculo: boolean
    motivos_recalculo: string[]
  }
}

export type GuardarPlanLotePayload = { motivo?: string }
export type GuardarPlanAlimentoPayload = { motivo?: string }
export type CrearPlanLotePayload = { peso_objetivo_g: number; motivo?: string }

export async function listarLotes(): Promise<LoteGuia[]> {
  return listarTodasLasPaginas<LoteGuia>('/lotes')
}

export async function listarLineasGeneticas(): Promise<LineaGenetica[]> {
  return listarTodasLasPaginas<LineaGenetica>('/lineas-geneticas')
}

export async function listarCurvasGeneticas(): Promise<CurvaGeneticaResumen[]> {
  return listarTodasLasPaginas<CurvaGeneticaResumen>('/curvas-geneticas')
}

export async function obtenerCurvaGenetica(id: number): Promise<CurvaGenetica> {
  const { data } = await api.get<CurvaGenetica>(`/curvas-geneticas/${id}`)
  return data
}

export async function listarIndicadores(loteId: number): Promise<IndicadorLote[]> {
  const { data } = await api.get<IndicadorLote[]>(`/indicadores/${loteId}`)
  return data
}

export async function compararConCurva(loteId: number): Promise<ComparacionLote> {
  const { data } = await api.get<ComparacionLote>(`/indicadores/${loteId}/comparacion`)
  return data
}

export async function crearPlanLote(
  loteId: number,
  payload: CrearPlanLotePayload,
): Promise<PlanLoteGuia> {
  const { data } = await api.post<PlanLoteGuia>(`/lotes/${loteId}/plan`, payload)
  return data
}

export async function getPlanLote(loteId: number): Promise<PlanLoteGuia | null> {
  try {
    const { data } = await api.get<PlanLoteGuia>(`/lotes/${loteId}/plan`)
    return data
  } catch (error) {
    if (esNotFound(error)) return null
    throw error
  }
}

export async function getPlanAlimentoLote(loteId: number): Promise<PlanAlimentoGuia | null> {
  try {
    const { data } = await api.get<PlanAlimentoGuia>(`/lotes/${loteId}/plan/alimento`)
    return data
  } catch (error) {
    if (esNotFound(error)) return null
    throw error
  }
}

export async function recalcularPlanLote(
  loteId: number,
  payload: GuardarPlanLotePayload = {},
): Promise<PlanLoteGuia> {
  const { data } = await api.post<PlanLoteGuia>(`/lotes/${loteId}/plan/recalcular`, payload)
  return data
}

export async function guardarPlanAlimentoLote(
  loteId: number,
  payload: GuardarPlanAlimentoPayload = {},
): Promise<PlanAlimentoGuia> {
  const { data } = await api.post<PlanAlimentoGuia>(`/lotes/${loteId}/plan/alimento`, payload)
  return data
}
