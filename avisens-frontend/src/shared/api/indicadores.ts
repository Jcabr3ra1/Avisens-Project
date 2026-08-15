import { api } from './client'

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
