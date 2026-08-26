import { api } from './client'

export interface Prediccion {
  lote_id: number
  peso_proyectado_faena_g: number
  dias_al_objetivo: number | null
  dia_faena_estimado: number | null
  fecha_registro: string
}

export async function predecirLote(loteId: number): Promise<Prediccion> {
  const { data } = await api.get<Prediccion>(`/predicciones/${loteId}`)
  return data
}

export async function historialPredicciones(
  loteId: number,
): Promise<Prediccion[]> {
  const { data } = await api.get<Prediccion[]>(
    `/predicciones/lote/${loteId}/historial`,
  )
  return data
}
