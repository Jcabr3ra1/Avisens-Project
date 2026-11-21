import { describe, expect, it } from 'vitest'
import type { ReporteFinanciero } from '../api/reporte-financiero'
import {
  descripcionAlcance,
  errorDeFiltro,
  filtroDesdeFormulario,
  formularioReporteVacio,
  hojasDelReporte,
  nombreArchivoReporte,
  type FormularioReporte,
} from './reporteFinanciero'

const base: FormularioReporte = formularioReporteVacio('2026-11-17')

const reporteLote: ReporteFinanciero = {
  alcance: { tipo: 'lote', lote_id: 7 },
  generado_en: '2026-11-17T15:00:00.000Z',
  totales: { ingresos: 10_000_000, egresos: 7_500_000, balance: 2_500_000, margen_neto_pct: 25, movimientos: 4 },
  lotes: [{
    lote_id: 7,
    codigo: 'L-007',
    granja: 'Granja Norte',
    estado: 'finalizado',
    dia_vida: 42,
    cantidad_inicial: 1000,
    aves_vivas: 950,
    costo_por_ave: 7894.74,
    presupuesto_cop: 10_000_000,
    presupuesto_usado_pct: 75,
    peso_actual_kg: 2.45,
    peso_objetivo_kg: 2.5,
    ingresos: 10_000_000,
    egresos: 7_500_000,
    balance: 2_500_000,
    margen_neto_pct: 25,
    egresos_por_categoria: [],
  }],
  gastos_generales: { ingresos: 0, egresos: 0, balance: 0, margen_neto_pct: null, movimientos: 0 },
  por_categoria: [
    { categoria_id: 1, nombre: 'Venta de aves', tipo: 'ingreso', total: 10_000_000, movimientos: 1 },
    { categoria_id: 3, nombre: 'Compra de alimento', tipo: 'egreso', total: 4_000_000, movimientos: 2 },
  ],
  avisos: [],
  completo: true,
}

describe('filtro del reporte', () => {
  it('arranca en el mes en curso', () => {
    expect(base.fecha_desde).toBe('2026-11-01')
    expect(base.fecha_hasta).toBe('2026-11-17')
  })

  it('exige el lote en modo lote', () => {
    expect(errorDeFiltro(base)).toMatch(/Elige el lote/)
    expect(errorDeFiltro({ ...base, lote_id: '7' })).toBe('')
    expect(filtroDesdeFormulario({ ...base, lote_id: '7' })).toEqual({ lote_id: 7 })
  })

  it('valida el rango del periodo', () => {
    const periodo = { ...base, modo: 'periodo' as const }
    expect(errorDeFiltro({ ...periodo, fecha_desde: '' })).toMatch(/fecha inicial y la final/)
    expect(errorDeFiltro({ ...periodo, fecha_desde: '2026-12-01' })).toMatch(/posterior/)
    expect(errorDeFiltro({ ...periodo, fecha_desde: '2024-01-01' })).toMatch(/dos años/)
    expect(errorDeFiltro(periodo)).toBe('')
  })

  it('manda la granja solo si se eligió una', () => {
    const periodo = { ...base, modo: 'periodo' as const }
    expect(filtroDesdeFormulario(periodo)).toEqual({ fecha_desde: '2026-11-01', fecha_hasta: '2026-11-17' })
    expect(filtroDesdeFormulario({ ...periodo, granja_id: '2' })).toMatchObject({ granja_id: 2 })
  })
})

describe('presentación del reporte', () => {
  it('describe el alcance y nombra el archivo', () => {
    expect(descripcionAlcance(reporteLote)).toBe('Ciclo del lote L-007 · Granja Norte')
    expect(nombreArchivoReporte(reporteLote)).toBe('reporte-financiero-L-007')

    const periodo: ReporteFinanciero = {
      ...reporteLote,
      alcance: { tipo: 'periodo', fecha_desde: '2026-09-01', fecha_hasta: '2026-10-31', granja_id: null },
    }
    expect(descripcionAlcance(periodo)).toMatch(/^Del .+ al .+ · Todas las granjas$/)
    expect(nombreArchivoReporte(periodo)).toBe('reporte-financiero-2026-09-01-a-2026-10-31')
  })

  it('arma las tres hojas del Excel con los montos como número', () => {
    const [resumen, lotes, categorias] = hojasDelReporte(reporteLote)

    expect(resumen.nombre).toBe('Resumen')
    expect(resumen.filas).toContainEqual(['Margen neto (%)', { valor: 25, estilo: 'decimal' }])
    expect(lotes.filas).toHaveLength(2)
    expect(lotes.filas[1][0]).toBe('L-007')
    expect(lotes.filas[1][2]).toBe('Finalizado')
    expect(lotes.filas[1][10]).toEqual({ valor: 7894.74, estilo: 'moneda' })
    expect(categorias.filas[1]).toEqual(['Ingreso', 'Venta de aves', 1, { valor: 10_000_000, estilo: 'moneda' }])
  })

  it('lista los avisos de datos incompletos en el resumen', () => {
    const [resumen] = hojasDelReporte({
      ...reporteLote,
      completo: false,
      avisos: [{ codigo: 'sin-venta', mensaje: 'Falta la venta.' }],
    })
    expect(resumen.filas).toContainEqual([{ valor: 'Avisos de datos incompletos', estilo: 'titulo' }])
    expect(resumen.filas).toContainEqual(['Falta la venta.'])
  })
})
