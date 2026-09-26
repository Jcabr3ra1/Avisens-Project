import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

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

// Trae TODOS los movimientos, no la primera página: las tarjetas de ingresos,
// egresos y balance se calculan sumando esta lista. Con un tope de 100 las tres
// cifras quedaban mal en cuanto la granja pasara ese número de movimientos, y
// sin ningún aviso — que en una pantalla de dinero es el peor modo de fallar.
export async function listarMovimientosFinancieros(): Promise<MovimientoFinanciero[]> {
  return listarTodasLasPaginas<MovimientoFinanciero>('/movimientos-financieros')
}

// El backend todavía no expone un listado de categorías, así que si la ruta no
// existe se reconstruyen a partir de las que ya aparecen en los movimientos:
// son categorías reales y válidas. Cuando exista el endpoint, este respaldo
// deja de usarse solo.
export async function listarCategoriasFinancieras(
  respaldo: CategoriaFinanciera[] = [],
): Promise<CategoriaFinanciera[]> {
  try {
    return await listarTodasLasPaginas<CategoriaFinanciera>('/categorias-financieras')
  } catch {
    const porId = new Map(respaldo.map((categoria) => [categoria.id, categoria]))
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
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
