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

export type EstadoCalculoIndicador =
  | 'legado_sin_verificar'
  | 'calculado'
  | 'mortalidad_incoherente'

export type VeredictoComparacion =
  | 'sin_dato_valido'
  | 'peso_no_disponible'
  | 'sin_referencia'
  | 'sin_datos'
  | 'por_debajo'
  | 'por_encima'
  | 'en_objetivo'

export interface ComparacionIndicador {
  estado_actual: EstadoCalculoIndicador
  fecha_estado_actual: string
  fecha_del_dato_usado: string | null
  dia_vida: number | null
  veredicto: VeredictoComparacion
  mensaje?: string
  real: { peso_promedio_g: number | null; fcr: number | null } | null
  objetivo: { peso_esperado_g: number | null; fcr_objetivo: number | null } | null
  dia_curva?: number
  desvio_peso_pct?: number | null
  desvio_fcr?: number | null
}

export interface FinanzasLote {
  lote_id: number
  estado_actual: EstadoCalculoIndicador
  fecha_estado_actual: string | null
  fecha_del_dato_usado: string | null
  costo_total_cop: number
  ingreso_total_cop: number
  margen_cop: number
  kg_producidos: number | null
  costo_por_kg_cop: number | null
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
