import type { Insumo } from '../api/insumos'
import type { TipoMovimiento } from '../api/movimientos'

export type EstadoStock = 'ok' | 'bajo' | 'critico' | 'agotado'

export const ETIQUETA_STOCK: Record<EstadoStock, string> = {
  ok: 'Stock OK',
  bajo: 'Stock bajo',
  critico: 'Stock crítico',
  agotado: 'Agotado',
}

// El semáforo se mide contra el mínimo que el usuario definió para ese
// insumo, no contra un número fijo: 20 sacos de alimento son mucho o poco
// según la granja.
export function estadoStock(insumo: Insumo): EstadoStock {
  if (insumo.stock_actual <= 0) return 'agotado'
  // Sin mínimo declarado no hay contra qué comparar; no se inventa una alarma.
  if (insumo.stock_minimo <= 0) return 'ok'
  const ratio = insumo.stock_actual / insumo.stock_minimo
  if (ratio < 0.5) return 'critico'
  if (ratio < 1) return 'bajo'
  return 'ok'
}

// Cuánto llenar la barra. El tope visual es el doble del mínimo: por encima
// de eso ya no aporta información, solo alarga la barra.
export function porcentajeDeStock(insumo: Insumo): number {
  if (insumo.stock_minimo <= 0) return insumo.stock_actual > 0 ? 100 : 0
  const pct = (insumo.stock_actual / (insumo.stock_minimo * 2)) * 100
  return Math.max(0, Math.min(100, pct))
}

export type ResumenInventario = {
  total: number
  criticos: number
  bajos: number
  agotados: number
  valorTotalCop: number
}

export function resumirInventario(insumos: Insumo[]): ResumenInventario {
  const estados = insumos.map(estadoStock)
  return {
    total: insumos.length,
    criticos: estados.filter((estado) => estado === 'critico').length,
    bajos: estados.filter((estado) => estado === 'bajo').length,
    agotados: estados.filter((estado) => estado === 'agotado').length,
    valorTotalCop: insumos.reduce(
      (total, insumo) => total + insumo.stock_actual * (insumo.precio_unitario_cop ?? 0),
      0,
    ),
  }
}

// Los que necesitan reposición van primero: es la razón por la que alguien
// entra a la bodega.
const ORDEN_URGENCIA: Record<EstadoStock, number> = {
  agotado: 0,
  critico: 1,
  bajo: 2,
  ok: 3,
}

export function ordenarPorUrgencia(insumos: Insumo[]): Insumo[] {
  return [...insumos].sort((a, b) => {
    const diferencia = ORDEN_URGENCIA[estadoStock(a)] - ORDEN_URGENCIA[estadoStock(b)]
    if (diferencia !== 0) return diferencia
    return a.nombre.localeCompare(b.nombre, 'es-CO')
  })
}

export type FiltroStock = 'todos' | 'reposicion' | 'inactivos'

export function filtrarInsumos(
  insumos: Insumo[],
  busqueda: string,
  filtro: FiltroStock,
): Insumo[] {
  const termino = busqueda.trim().toLowerCase()
  return insumos.filter((insumo) => {
    if (filtro === 'inactivos' && insumo.activo) return false
    if (filtro !== 'inactivos' && !insumo.activo) return false
    if (filtro === 'reposicion' && estadoStock(insumo) === 'ok') return false
    if (!termino) return true
    return (
      insumo.nombre.toLowerCase().includes(termino) ||
      (insumo.tipo?.toLowerCase().includes(termino) ?? false) ||
      (insumo.ubicacion_almacen?.toLowerCase().includes(termino) ?? false)
    )
  })
}

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

// Cómo se lee la cantidad en el historial: una salida resta, un ajuste no
// suma ni resta sino que fija el stock, así que no lleva signo.
export function signoDeMovimiento(tipo: TipoMovimiento): '+' | '−' | '' {
  if (tipo === 'entrada') return '+'
  if (tipo === 'salida') return '−'
  return ''
}
