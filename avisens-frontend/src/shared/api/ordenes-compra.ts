import { api } from './client'
import type { PaginatedResponse } from './types'

export type EstadoOrdenCompra =
  | 'pendiente'
  | 'en_proceso'
  | 'entregada'
  | 'cancelada'

export interface InsumoDeDetalle {
  id: number
  nombre: string
  unidad_medida: string
  activo: boolean
}

export interface GranjaDeOrden {
  id: number
  nombre: string
  propietario_id: number
}

export interface UsuarioDeOrden {
  id: number
  nombre_completo: string
  email: string
}

export interface DetalleOrdenCompra {
  id: number
  orden_compra_id: number
  insumo_id: number
  cantidad: number
  cantidad_recibida: number
  unidad_medida: string
  precio_unitario_cop: number
  subtotal_cop: number
  insumo: InsumoDeDetalle
}

export interface OrdenCompra {
  id: number
  granja_id: number
  proveedor_id: number
  lote_id: number | null
  codigo: string
  fecha_pedido: string | null
  fecha_entrega_estimada: string | null
  fecha_entrega_real: string | null
  valor_total_cop: number | null
  estado: EstadoOrdenCompra
  calificacion_cumplimiento: number | null
  calificacion_calidad: number | null
  calificacion_tiempo: number | null
  usuario_id: number
  fecha_registro: string
  granja: GranjaDeOrden
  usuario: UsuarioDeOrden
  detalles: DetalleOrdenCompra[]
}

export interface CrearOrdenCompraPayload {
  proveedor_id: number
  codigo: string
  usuario_id: number
  granja_id?: number
  lote_id?: number
  fecha_pedido?: string
  fecha_entrega_estimada?: string
  fecha_entrega_real?: string
  valor_total_cop?: number
  estado?: EstadoOrdenCompra
  calificacion_cumplimiento?: number
  calificacion_calidad?: number
  calificacion_tiempo?: number
}

export type ActualizarOrdenCompraPayload = Partial<CrearOrdenCompraPayload>

export interface CrearDetalleOrdenPayload {
  insumo_id: number
  cantidad: number
  precio_unitario_cop: number
}

export interface ItemRecepcionOrden {
  detalle_id: number
  cantidad: number
}

export interface RecibirOrdenPayload {
  clave_idempotencia: string
  items: ItemRecepcionOrden[]
  comprobante_url?: string
}

export interface OrdenesCompraQuery {
  page?: number
  limit?: number
}

export async function listarOrdenesCompra(
  query: OrdenesCompraQuery = {},
): Promise<OrdenCompra[]> {
  const { data } = await api.get<PaginatedResponse<OrdenCompra>>(
    '/ordenes-compra',
    { params: { page: 1, limit: 100, ...query } },
  )
  return data.data
}

export async function obtenerOrdenCompra(id: number): Promise<OrdenCompra> {
  const { data } = await api.get<OrdenCompra>(`/ordenes-compra/${id}`)
  return data
}

export async function crearOrdenCompra(
  payload: CrearOrdenCompraPayload,
): Promise<OrdenCompra> {
  const { data } = await api.post<OrdenCompra>('/ordenes-compra', payload)
  return data
}

export async function actualizarOrdenCompra(
  id: number,
  payload: ActualizarOrdenCompraPayload,
): Promise<OrdenCompra> {
  const { data } = await api.patch<OrdenCompra>(`/ordenes-compra/${id}`, payload)
  return data
}

export async function agregarDetalleOrden(
  id: number,
  payload: CrearDetalleOrdenPayload,
): Promise<DetalleOrdenCompra> {
  const { data } = await api.post<DetalleOrdenCompra>(
    `/ordenes-compra/${id}/detalles`,
    payload,
  )
  return data
}

export async function eliminarDetalleOrden(
  id: number,
  detalleId: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/ordenes-compra/${id}/detalles/${detalleId}`,
  )
  return data
}

export async function recibirOrdenCompra(
  id: number,
  payload: RecibirOrdenPayload,
): Promise<OrdenCompra> {
  const { data } = await api.post<OrdenCompra>(
    `/ordenes-compra/${id}/recepciones`,
    payload,
  )
  return data
}

export async function eliminarOrdenCompra(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/ordenes-compra/${id}`,
  )
  return data
}
