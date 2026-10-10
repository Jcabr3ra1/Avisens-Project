import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

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

export type PlanLote = {
  id: number
  lote_id: number
  peso_objetivo_g: number
  estado_dia: 'calculado' | 'sin_curva' | 'fuera_de_rango' | 'datos_insuficientes'
  motivo: string | null
  resultado: {
    dia_objetivo: number | null
    dia_objetivo_interpolado: number | null
    fecha_salida_calculada: string | null
  }
}

export type CrearPlanLotePayload = {
  peso_objetivo_g: number
  motivo: string
}

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

export async function obtenerPlanLote(loteId: number): Promise<PlanLote | null> {
  try {
    const { data } = await api.get<PlanLote>(`/lotes/${loteId}/plan`)
    return data
  } catch (error: unknown) {
    const estado = (error as { response?: { status?: number } }).response?.status
    if (estado === 404) return null
    throw error
  }
}

export async function crearPlanLote(loteId: number, payload: CrearPlanLotePayload): Promise<PlanLote> {
  const { data } = await api.post<PlanLote>(`/lotes/${loteId}/plan`, payload)
  return data
}