import { api } from '@shared/api/client'

// Espejo de ReporteFinanciero del backend (movimientos-financieros/reporte).

export type AlcanceReporte =
  | { tipo: 'lote'; lote_id: number }
  | { tipo: 'periodo'; fecha_desde: string; fecha_hasta: string; granja_id: number | null }

export interface BalanceReporte {
  ingresos: number
  egresos: number
  balance: number
  margen_neto_pct: number | null
  movimientos: number
}

export interface TotalCategoria {
  categoria_id: number
  nombre: string
  tipo: 'ingreso' | 'egreso'
  total: number
  movimientos: number
}

export interface ResumenLoteReporte {
  lote_id: number
  codigo: string
  granja: string
  estado: 'activo' | 'finalizado' | 'inactivo'
  dia_vida: number
  cantidad_inicial: number
  aves_vivas: number
  costo_por_ave: number | null
  presupuesto_cop: number | null
  presupuesto_usado_pct: number | null
  peso_actual_kg: number | null
  peso_objetivo_kg: number | null
  ingresos: number
  egresos: number
  balance: number
  margen_neto_pct: number | null
  egresos_por_categoria: TotalCategoria[]
}

export type CodigoAviso =
  | 'sin-movimientos'
  | 'sin-tipo'
  | 'periodo-sin-datos'
  | 'categoria-faltante'
  | 'sin-venta'
  | 'ciclo-en-curso'

export interface AvisoReporte {
  codigo: CodigoAviso
  mensaje: string
}

export interface ReporteFinanciero {
  alcance: AlcanceReporte
  generado_en: string
  totales: BalanceReporte
  lotes: ResumenLoteReporte[]
  gastos_generales: BalanceReporte
  por_categoria: TotalCategoria[]
  avisos: AvisoReporte[]
  completo: boolean
}

export interface FiltroReporte {
  lote_id?: number
  granja_id?: number
  fecha_desde?: string
  fecha_hasta?: string
}

export async function obtenerReporteFinanciero(
  filtro: FiltroReporte,
): Promise<ReporteFinanciero> {
  const { data } = await api.get<ReporteFinanciero>(
    '/movimientos-financieros/reporte',
    { params: filtro },
  )
  return data
}
