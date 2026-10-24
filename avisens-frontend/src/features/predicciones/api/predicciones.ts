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

export async function simularFaena(loteId: number, diaFaena: number): Promise<ResultadoPrediccion> {
  const { data } = await api.get<ResultadoPrediccion>(`/predicciones/lote/${loteId}/simulacion`, {
    params: { dia_faena: diaFaena },
  })
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

export interface PuntoCurvaCrecimiento {
  dia: number
  real_g: number | null
  proyectado_g: number
  min_g: number
  max_g: number
  estandar_g: number | null
  marca_g: number | null
}

export interface CurvaCrecimiento {
  lote_id: number
  codigo: string
  dia_actual: number
  dia_final: number
  peso_objetivo_g: number | null
  referencias: {
    genetica: { linea: string; sexo: string; version: number; fuente: string } | null
    marca: { marca: string } | null
  }
  serie: PuntoCurvaCrecimiento[]
  resumen: {
    ultimo_pesaje: { dia: number; peso_g: number }
    desvio_vs_estandar_pct: number | null
    peso_final_g: number
    dia_al_objetivo: number | null
    fecha_al_objetivo: string | null
    punto_inflexion: { dia: number; peso_g: number; ganancia_max_g_dia: number }
  }
  modelo: { nombre: string; version: string; confianza: number; puntos_usados: number }
}

export async function obtenerCurvaCrecimiento(loteId: number): Promise<CurvaCrecimiento> {
  const { data } = await api.get<CurvaCrecimiento>(
    `/predicciones/lote/${loteId}/curva-crecimiento`,
  )
  return data
}

export type NivelCalor = 'confort' | 'atencion' | 'alerta' | 'peligro' | 'emergencia'

export interface HoraRiesgoCalor {
  hora: string
  temperatura: number
  humedad: number
  thi: number
  nivel: NivelCalor
}

export interface RiesgoCalor {
  galpon_id: number
  galpon: string
  lote: { codigo: string; dia_vida: number | null } | null
  ubicacion: { latitud: number; longitud: number; origen: 'granja' | 'municipio' }
  interior: { temperatura: number | null; humedad: number | null }
  serie: HoraRiesgoCalor[]
  pico: HoraRiesgoCalor
  nivel_maximo: NivelCalor
  horas_por_nivel: Record<NivelCalor, number>
  primera_alerta: string | null
  ajuste_aplicado: { temperatura: number; humedad: number }
  recomendaciones: string[]
  modelo: { nombre: string; version: string; tipo: string; confianza: number; puntos_usados: number }
}

export async function obtenerRiesgoCalor(galponId: number): Promise<RiesgoCalor> {
  const { data } = await api.get<RiesgoCalor>(`/predicciones/galpon/${galponId}/riesgo-calor`)
  return data
}
