import { api } from '@shared/api/client'

export interface IndicadorLote {
  id: number
  lote_id: number
  fecha: string
  dia_vida: number | null
  peso_promedio_g: number | null
  fcr: number | null
  epef: number | null
  uniformidad_pct: number | null
  mortalidad_acumulada_pct: number | null
  consumo_acumulado_g: number | null
  calculado_en: string
}

export async function calcularIndicadores(
  loteId: number,
): Promise<IndicadorLote> {
  const { data } = await api.post<IndicadorLote>(
    `/indicadores/calcular/${loteId}`,
  )
  return data
}

export async function listarIndicadores(
  loteId: number,
): Promise<IndicadorLote[]> {
  const { data } = await api.get<IndicadorLote[]>(`/indicadores/${loteId}`)
  return data
}

export interface ComparacionIndicador {
  lote_id: number
  dia_vida: number
  peso_real: number | null
  peso_objetivo: number | null
  fcr_real: number | null
  fcr_objetivo: number | null
  desvio_peso_pct: number | null
  desvio_fcr_pct: number | null
}

export interface FinanzasLote {
  lote_id: number
  costo_total_cop: number | null
  costo_por_kg_cop: number | null
  ingreso_estimado_cop: number | null
  margen_cop: number | null
  roi_pct: number | null
}

// Compara el último indicador del lote contra su curva objetivo.
export async function compararConCurva(loteId: number): Promise<ComparacionIndicador> {
  const { data } = await api.get<ComparacionIndicador>(`/indicadores/${loteId}/comparacion`)
  return data
}

// KPIs financieros del lote: costo por kilo, margen y ROI. Solo Admin y Propietario.
export async function obtenerFinanzasLote(loteId: number): Promise<FinanzasLote> {
  const { data } = await api.get<FinanzasLote>(`/indicadores/${loteId}/finanzas`)
  return data
}

// Genera una alerta cuando el lote se aparta de la curva objetivo.
export async function generarAlertaDesvio(loteId: number): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>(`/indicadores/${loteId}/alerta-desvio`)
  return data
}
