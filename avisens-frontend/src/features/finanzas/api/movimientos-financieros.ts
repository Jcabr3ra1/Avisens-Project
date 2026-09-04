import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface GranjaDeMovimiento {
  id: number
  nombre: string
  propietario_id: number
}

export interface CategoriaFinanciera {
  id: number
  nombre: string
  tipo: string | null
}

export interface LoteDeMovimiento {
  id: number
  codigo: string
}

export interface MovimientoFinanciero {
  id: number
  granja_id: number
  lote_id: number | null
  categoria_id: number
  proveedor_id: number | null
  tipo: string | null
  valor_cop: number
  fecha: string
  descripcion: string | null
  numero_factura: string | null
  comprobante_url: string | null
  metodo_pago: string | null
  usuario_id: number
  fecha_registro: string
  granja: GranjaDeMovimiento
  categoria: CategoriaFinanciera
  lote: LoteDeMovimiento | null
}

export interface CrearMovimientoFinancieroPayload {
  categoria_id: number
  tipo: string
  valor_cop: number
  fecha: string
  granja_id?: number
  lote_id?: number
  proveedor_id?: number
  descripcion?: string
  numero_factura?: string
  metodo_pago?: string
}

export type ActualizarMovimientoFinancieroPayload =
  Partial<CrearMovimientoFinancieroPayload>

export interface MovimientosFinancierosQuery {
  page?: number
  limit?: number
}

export async function listarMovimientosFinancieros(
  query: MovimientosFinancierosQuery = {},
): Promise<MovimientoFinanciero[]> {
  const { data } = await api.get<PaginatedResponse<MovimientoFinanciero>>(
    '/movimientos-financieros',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerMovimientoFinanciero(
  id: number,
): Promise<MovimientoFinanciero> {
  const { data } = await api.get<MovimientoFinanciero>(
    `/movimientos-financieros/${id}`,
  )
  return data
}

export async function crearMovimientoFinanciero(
  payload: CrearMovimientoFinancieroPayload,
): Promise<MovimientoFinanciero> {
  const { data } = await api.post<MovimientoFinanciero>(
    '/movimientos-financieros',
    payload,
  )
  return data
}

export async function actualizarMovimientoFinanciero(
  id: number,
  payload: ActualizarMovimientoFinancieroPayload,
): Promise<MovimientoFinanciero> {
  const { data } = await api.patch<MovimientoFinanciero>(
    `/movimientos-financieros/${id}`,
    payload,
  )
  return data
}

export async function eliminarMovimientoFinanciero(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/movimientos-financieros/${id}`,
  )
  return data
}
