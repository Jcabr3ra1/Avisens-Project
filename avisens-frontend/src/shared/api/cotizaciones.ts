import { api } from './client'

export interface Cotizacion {
  id: number
  prospecto_id: number
  codigo: string | null
  plan_recomendado: string | null
  numero_galpones: number | null
  numero_aves: number | null
  valor_total_cop: number | null
  estado: string
  fecha_generacion: string
}

export interface LineaCotizacion {
  tipo_sensor: string
  nombre: string
  cantidad: number
  precio_unitario_cop: number
  subtotal_cop: number
}

export interface CotizacionGenerada extends Cotizacion {
  lineas: LineaCotizacion[]
  instalacion_cop: number
  nota: string
}

export async function generarCotizacion(
  prospectoId: number,
  payload?: { numero_galpones?: number; incluir_opcionales?: boolean },
): Promise<CotizacionGenerada> {
  const { data } = await api.post<CotizacionGenerada>(
    `/cotizaciones/prospecto/${prospectoId}`,
    payload ?? {},
  )
  return data
}

export async function listarCotizacionesProspecto(
  prospectoId: number,
): Promise<Cotizacion[]> {
  const { data } = await api.get<Cotizacion[]>(
    `/cotizaciones/prospecto/${prospectoId}`,
  )
  return data
}
