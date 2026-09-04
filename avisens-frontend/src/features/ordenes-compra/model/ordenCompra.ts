import { fechaDeHoy } from '@shared/utils/fechas'
export type EstadoOrdenCompra = 'pendiente' | 'en_proceso' | 'entregada' | 'cancelada'

export type InsumoDeDetalle = {
  id: number
  nombre: string
  unidad_medida: string
  activo: boolean
}

export type DetalleOrdenCompra = {
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

export type OrdenCompra = {
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
  usuario_id: number
  fecha_registro: string
  granja: { id: number; nombre: string; propietario_id: number }
  proveedor: { id: number; nombre: string; nit: string }
  lote: { id: number; codigo: string } | null
  detalles: DetalleOrdenCompra[]
}

export type CrearOrdenCompraPayload = {
  proveedor_id: number
  codigo: string
  usuario_id: number
  granja_id?: number
  lote_id?: number
  fecha_pedido?: string
  fecha_entrega_estimada?: string
}

export type CrearDetalleOrdenPayload = {
  insumo_id: number
  cantidad: number
  precio_unitario_cop: number
}

export type RecibirOrdenPayload = {
  clave_idempotencia: string
  items: { detalle_id: number; cantidad: number }[]
}

export type FormularioOrden = {
  granja_id: string
  proveedor_id: string
  lote_id: string
  fecha_pedido: string
  fecha_entrega_estimada: string
}

export const FORMULARIO_ORDEN_INICIAL: FormularioOrden = {
  granja_id: '',
  proveedor_id: '',
  lote_id: '',
  fecha_pedido: fechaDeHoy(),
  fecha_entrega_estimada: '',
}

// Identificador de UN intento de recepción. El backend lo usa para reconocer
// un reintento y devolver el resultado anterior en vez de volver a sumar el
// stock. Por eso tiene que ser estable mientras se reintenta lo mismo: si
// cambia en cada llamada —como ocurría al construirla con Date.now()— la
// protección del backend no llega a actuar nunca.
export function nuevaClave(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `recepcion-${crypto.randomUUID()}`
  }
  return `recepcion-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
