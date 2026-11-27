import { describe, expect, it } from 'vitest'
import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import type { Lote } from '@features/lotes/api/lotes'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { crearLibroXlsx } from '@shared/utils/xlsx'
import type { IndicadorLote, PlanAlimentoGuia } from '../api/guiaCrecimiento'
import { hojasAlimentacionExcel, hojasCrecimientoExcel, hojasEjecutivoExcel } from './reportesExcel'

const loteMock: Lote = {
  id: 7,
  codigo: 'L-007',
  fecha_ingreso: '2026-10-01',
  cantidad_inicial: 1000,
} as Lote

describe('reportesExcel', () => {
  it('arma el reporte de alimentación con logo, resumen, consumos y totales', () => {
    const logo = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const consumos = [
      {
        id: 1,
        lote_id: 7,
        fecha: '2026-10-05',
        alimento_kg: 45.5,
        agua_litros: 90,
        metodo_registro: 'manual',
        tipo_alimento: { nombre: 'Preiniciador' },
      },
      {
        id: 2,
        lote_id: 99,
        fecha: '2026-10-05',
        alimento_kg: 100,
        agua_litros: 200,
        metodo_registro: 'manual',
      },
    ] as unknown as ConsumoDiario[]

    const plan = {
      efectiva: true,
      desactualizado: false,
      version: 2,
      desglose: {
        no_disponible: false,
        renglones: [{
          dia_inicio: 1,
          dia_fin: 7,
          tipo_alimento_nombre_snapshot: 'Preiniciador',
          consumo_total_kg: 150,
          consumo_por_ave_g: 150,
        }],
      },
    } as unknown as PlanAlimentoGuia

    const hojas = hojasAlimentacionExcel(loteMock, consumos, plan, logo)
    expect(hojas).toHaveLength(1)
    expect(hojas[0].nombre).toBe('Alimentación')
    expect(hojas[0].imagen?.datos).toBe(logo)
    expect(hojas[0].ocultarCuadricula).toBe(true)

    const libro = crearLibroXlsx(hojas)
    const texto = new TextDecoder().decode(libro)
    expect(texto).toContain('AVISENS · Reporte de Alimentación')
    expect(texto).toContain('Total registrado')
    expect(texto).toContain('Preiniciador')
    expect(texto).toContain('xl/media/image1.png')
  })

  it('arma el reporte de crecimiento con cabecera y proyección', () => {
    const indicadores = [{
      estado_calculo: 'calculado',
      dia_vida: 7,
      fecha: '2026-10-08',
      estado_peso: 'disponible',
      peso_promedio_g: 185,
      pesaje_fecha_snapshot: '2026-10-08',
      fcr: 1.12,
    }] as unknown as IndicadorLote[]

    const curva = {
      modelo: { puntos_usados: 2 },
      serie: [{ dia: 7, proyectado_g: 190, min_g: 175, max_g: 205, estandar_g: 188 }],
    } as unknown as CurvaCrecimiento

    const hojas = hojasCrecimientoExcel(loteMock, indicadores, curva, null)
    expect(hojas[0].nombre).toBe('Crecimiento')
    const texto = new TextDecoder().decode(crearLibroXlsx(hojas))
    expect(texto).toContain('AVISENS · Reporte de Crecimiento y Proyección')
    expect(texto).toContain('185')
  })

  it('arma el reporte ejecutivo con indicadores, balance y logo', () => {
    const logo = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const hojas = hojasEjecutivoExcel(loteMock, [], null, null, logo)
    expect(hojas[0].nombre).toBe('Ejecutivo')
    const texto = new TextDecoder().decode(crearLibroXlsx(hojas))
    expect(texto).toContain('AVISENS · Reporte Ejecutivo del Lote')
    expect(texto).toContain('1. Indicadores Zootécnicos Clave')
    expect(texto).toContain('2. Balance Financiero Preliminar (COP)')
    expect(texto).toContain('xl/media/image1.png')
  })
})
