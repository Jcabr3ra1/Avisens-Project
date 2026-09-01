import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type { MovimientoInventario, TipoMovimiento } from './movimientos'

export type { MovimientoInventario, TipoMovimiento } from './movimientos'

export interface Insumo {
  id: number
  granja_id: number
  nombre: string
  tipo: string | null
  unidad_medida: string
  stock_actual: number
  stock_minimo: number
  precio_unitario_cop: number | null
  proveedor_habitual_id: number | null
  ubicacion_almacen: string | null
  fecha_vencimiento: string | null
  activo: boolean
}

export interface CrearInsumoPayload {
  nombre: string
  unidad_medida: string
  tipo?: string
  stock_actual?: number
  stock_minimo?: number
  precio_unitario_cop?: number
  proveedor_habitual_id?: number
  ubicacion_almacen?: string
  fecha_vencimiento?: string
}

export type ActualizarInsumoPayload = Partial<CrearInsumoPayload> & {
  activo?: boolean
}

export interface RegistrarMovimientoPayload {
  tipo_movimiento: TipoMovimiento
  cantidad: number
  motivo?: string
  lote_id?: number
  comprobante_url?: string
}

// El backend tope a 100 por página y no recorta: pedir 200 devolvía 400 y la
// bodega se quedaba vacía con un "no se pudo cargar".
const LIMITE_POR_PAGINA = 100

export async function listarInsumos(): Promise<Insumo[]> {
  const primeraRespuesta = await api.get<PaginatedResponse<Insumo>>('/insumos', {
    params: { page: 1, limit: LIMITE_POR_PAGINA },
  })
  const primeraPagina = primeraRespuesta.data

  if (primeraPagina.meta.totalPages <= 1) return primeraPagina.data

  const restantes = await Promise.all(
    Array.from({ length: primeraPagina.meta.totalPages - 1 }, (_, indice) =>
      api.get<PaginatedResponse<Insumo>>('/insumos', {
        params: { page: indice + 2, limit: LIMITE_POR_PAGINA },
      }),
    ),
  )

  return [...primeraPagina.data, ...restantes.flatMap((respuesta) => respuesta.data.data)]
}

export async function obtenerInsumo(id: number): Promise<Insumo> {
  const { data } = await api.get<Insumo>(`/insumos/${id}`)
  return data
}

export async function crearInsumo(payload: CrearInsumoPayload): Promise<Insumo> {
  const { data } = await api.post<Insumo>('/insumos', payload)
  return data
}

export async function actualizarInsumo(
  id: number,
  payload: ActualizarInsumoPayload,
): Promise<Insumo> {
  const { data } = await api.patch<Insumo>(`/insumos/${id}`, payload)
  return data
}

export async function registrarMovimientoInsumo(
  id: number,
  payload: RegistrarMovimientoPayload,
): Promise<MovimientoInventario> {
  const { data } = await api.post<MovimientoInventario>(
    `/insumos/${id}/movimientos`,
    payload,
  )
  return data
}

export async function listarMovimientosInsumo(
  id: number,
): Promise<MovimientoInventario[]> {
  const { data } = await api.get<PaginatedResponse<MovimientoInventario>>(
    `/insumos/${id}/movimientos`,
    { params: { page: 1, limit: LIMITE_POR_PAGINA } },
  )
  return data.data
}

export async function activarInsumo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/insumos/${id}/activar`,
  )
  return data
}

export async function desactivarInsumo(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/insumos/${id}`,
  )
  return data
}

export async function eliminarInsumoPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/insumos/${id}/permanente`,
  )
  return data
}
