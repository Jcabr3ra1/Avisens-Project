import { api } from '@shared/api/client'

export type LineaCotizacion = {
  tipo_sensor: string
  nombre: string
  cantidad: number
  precio_unitario_cop: number | string
  subtotal_cop: number | string
}

export type CotizacionGenerada = {
  id: number
  codigo: string | null
  plan_recomendado: string
  numero_galpones: number
  area_galpon_m2: number
  numero_aves_estimado: number
  lineas: LineaCotizacion[]
  instalacion_cop: number | string
  valor_total_cop: number | string
  nota: string
}

export type SensorCotizado = {
  id: number
  cotizacion_id: number
  tipo_sensor: string
  cantidad: number
}

export type Cotizacion = {
  id: number
  prospecto_id: number
  codigo: string | null
  plan_recomendado: string | null
  numero_galpones: number | null
  numero_aves: number | null
  valor_total_cop: number | string | null
  url_pdf: string | null
  canal_envio: string | null
  estado: string
  fecha_generacion: string
  fecha_envio: string | null
  sensores: SensorCotizado[]
}

export type GenerarCotizacionPayload = {
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

export async function listarCotizaciones(
  prospectoId: number,
): Promise<Cotizacion[]> {
  const { data } = await api.get<Cotizacion[]>(
    `/cotizaciones/prospecto/${prospectoId}`,
  )
  return data
}
