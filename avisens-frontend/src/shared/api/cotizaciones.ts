import { api } from './client'

export interface LineaCotizacion {
  tipo_sensor: string
  nombre: string
  cantidad: number
  precio_unitario_cop: number
  subtotal_cop: number
}

export interface CotizacionGenerada {
  id: number
  codigo: string | null
  plan_recomendado: string | null
  numero_galpones: number | null
  area_galpon_m2: number | null
  numero_aves_estimado: number | null
  lineas: LineaCotizacion[]
  instalacion_cop: number
  valor_total_cop: number
  nota: string
}

export interface SensorCotizado {
  id: number
  cotizacion_id: number
  tipo_sensor: string
  cantidad: number
}

export interface Cotizacion {
  id: number
  prospecto_id: number
  codigo: string | null
  plan_recomendado: string | null
  numero_galpones: number | null
  numero_aves: number | null
  valor_total_cop: number | null
  url_pdf: string | null
  canal_envio: string | null
  estado: string
  fecha_generacion: string
  fecha_envio: string | null
  sensores: SensorCotizado[]
}

export interface GenerarCotizacionPayload {
  numero_galpones?: number
  incluir_opcionales?: boolean
}

export async function generarCotizacion(
  prospectoId: number,
  payload: GenerarCotizacionPayload = {},
): Promise<CotizacionGenerada> {
  const { data } = await api.post<CotizacionGenerada>(
    `/cotizaciones/prospecto/${prospectoId}`,
    payload,
  )
  return data
}

export async function listarCotizacionesDeProspecto(
  prospectoId: number,
): Promise<Cotizacion[]> {
  const { data } = await api.get<Cotizacion[]>(
    `/cotizaciones/prospecto/${prospectoId}`,
  )
  return data
}
