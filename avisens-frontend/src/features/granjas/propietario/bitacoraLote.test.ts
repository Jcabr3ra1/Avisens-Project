import { describe, expect, it } from 'vitest'
import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { agruparPorDia, consumoCreible, detalleSanitario, totalesConsumo, lineaDeTiempo, payloadConsumo } from './bitacoraLote'

const pesaje = { id: 1, lote_id: 9, fecha: '2026-10-17', peso_promedio_g: 2100, cantidad_aves_pesadas: 50, peso_objetivo_g: null, observaciones: null }
const muerte = { id: 2, lote_id: 9, fecha: '2026-10-17', cantidad_aves: 1, causa_presuntiva: 'Calor', disposicion: null, observaciones: null }
const vacuna = { id: 3, lote_id: 9, fecha: '2026-10-16', tipo: 'vacunacion', producto: 'Newcastle', diagnostico: null, cantidad_aves: null, observaciones: null }
const consumo = { id: 4, lote_id: 9, fecha: '2026-10-16', alimento_kg: 25.5, agua_litros: 60, tipo_alimento_id: 1, tipo_alimento: { id: 1, nombre: 'Preiniciador' } } as ConsumoDiario
const ajeno = { ...pesaje, id: 5, lote_id: 10 }

describe('lineaDeTiempo', () => {
  it('une los cuatro tipos del lote, del más reciente al más antiguo', () => {
    const movimientos = lineaDeTiempo(9, [pesaje, ajeno], [{ ...muerte, foto_mime_type: 'image/png' }], [vacuna], [consumo])
    expect(movimientos.map((m) => m.clave)).toEqual(['mortalidad-2', 'peso-1', 'consumo-4', 'sanitario-3'])
    expect(movimientos[0]).toMatchObject({ tieneFoto: true })
    expect(movimientos[1]).toMatchObject({ titulo: 'Pesaje · 2.100 g por ave', detalle: '50 aves pesadas' })
    expect(movimientos[2]).toMatchObject({ titulo: 'Consumo · 25,5 kg de alimento', detalle: 'Preiniciador · 60 L de agua' })
    expect(movimientos[3]).toMatchObject({ titulo: 'Vacunación', detalle: 'Producto: Newcastle' })
  })
})

describe('agruparPorDia', () => {
  it('agrupa por fecha con etiquetas «Hoy» y «Ayer»', () => {
    const grupos = agruparPorDia(lineaDeTiempo(9, [pesaje], [muerte], [vacuna], [consumo]), new Date('2026-10-17T15:00:00'))
    expect(grupos.map((g) => [g.etiqueta, g.movimientos.length])).toEqual([['Hoy', 2], ['Ayer', 2]])
  })
})

describe('payloadConsumo', () => {
  it('exige alimento o agua, y el tipo cuando hay alimento', () => {
    const base = { lote_id: '9', tipo_alimento_id: '', fecha: '2026-10-17', alimento_kg: '', agua_litros: '' }
    expect(payloadConsumo(base, 9).error).toMatch(/al menos/)
    expect(payloadConsumo({ ...base, alimento_kg: '20' }, 9).error).toMatch(/tipo de alimento/)
    expect(payloadConsumo({ ...base, agua_litros: '40' }, 9)).toEqual({
      error: null,
      payload: { lote_id: 9, fecha: '2026-10-17', tipo_alimento_id: undefined, alimento_kg: undefined, agua_litros: 40, metodo_registro: 'manual' },
    })
  })

  it('rechaza cantidades desproporcionadas o astronómicas de alimento o agua', () => {
    const baseAlimento = { lote_id: '9', tipo_alimento_id: '1', fecha: '2026-10-17', alimento_kg: '999999', agua_litros: '' }
    expect(payloadConsumo(baseAlimento, 9).error).toMatch(/razonable/)
    const baseAgua = { lote_id: '9', tipo_alimento_id: '', fecha: '2026-10-17', alimento_kg: '', agua_litros: '999999' }
    expect(payloadConsumo(baseAgua, 9).error).toMatch(/razonable/)
  })
})

describe('QA-01 / Figura 2: registros imposibles ya guardados', () => {
  const absurdo = { ...consumo, id: 6, alimento_kg: 1.1e40, agua_litros: 1.1e50 } as ConsumoDiario

  it('un consumo de 1,1e+40 kg no es creíble para 500 aves; uno real sí', () => {
    expect(consumoCreible(absurdo, 500)).toBe(false)
    expect(consumoCreible(consumo, 500)).toBe(true)
  })

  it('los totales de alimento y agua no suman el registro imposible y avisan cuántos quedaron fuera', () => {
    expect(totalesConsumo([consumo, absurdo], 500)).toEqual({ alimentoKg: 25.5, aguaLitros: 60, fueraDeRango: 1 })
  })

  it('el historial marca el registro como fuera de rango sin mostrar la cifra absurda', () => {
    const pesoAbsurdo = { ...pesaje, id: 7, peso_promedio_g: 1e15 }
    const movimientos = lineaDeTiempo(9, [pesoAbsurdo], [], [], [absurdo], 500)
    expect(movimientos.every((m) => m.fueraDeRango)).toBe(true)
    expect(movimientos.map((m) => m.titulo)).toEqual(['Pesaje · dato fuera de rango', 'Consumo · dato fuera de rango'])
  })
})

describe('detalleSanitario (QA 17-nov)', () => {
  it('etiqueta el producto, el diagnóstico y las aves para que se lean solos', () => {
    expect(detalleSanitario({ producto: 'Enrofloxacina', diagnostico: 'CRD', cantidad_aves: 500 }))
      .toBe('Producto: Enrofloxacina · Diagnóstico: CRD · 500 aves')
    expect(detalleSanitario({ producto: '77777', diagnostico: '8888', cantidad_aves: null }))
      .toBe('Producto: 77777 · Diagnóstico: 8888')
  })

  it('dice qué falta cuando no hay producto ni diagnóstico', () => {
    expect(detalleSanitario({ producto: null, diagnostico: '  ', cantidad_aves: null })).toBe('Sin producto ni diagnóstico')
  })
})
