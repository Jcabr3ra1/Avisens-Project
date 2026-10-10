import { describe, expect, it } from 'vitest'
import type { IndicadorLote } from '../api/guiaCrecimiento'
import {
  interpolarPuntoEnDia,
  obtenerPesoVerificado,
} from './guiaCrecimiento'

describe('peso verificado de la guía', () => {
  const indicador: IndicadorLote = {
    id: 1, lote_id: 1, fecha: '2026-10-09T00:00:00Z', dia_vida: 4,
    peso_promedio_g: 130, fcr: null, consumo_acumulado_g: null,
    estado_calculo: 'calculado', revision_calculo: 1, estado_peso: 'disponible',
    pesaje_fecha_snapshot: '2026-10-08T00:00:00Z',
  }

  it('conserva la fecha del pesaje, que puede ser anterior al cálculo', () => {
    expect(obtenerPesoVerificado(indicador)).toEqual({ gramos: 130, fecha: '2026-10-08T00:00:00Z' })
  })

  const incompletos: Array<[string, Partial<IndicadorLote>]> = [
    ['mortalidad incoherente', { estado_calculo: 'mortalidad_incoherente' }],
    ['dato legado', { estado_calculo: 'legado_no_verificado' }],
    ['sin revisión', { revision_calculo: 0 }],
    ['sin peso', { estado_peso: 'sin_pesajes', peso_promedio_g: null }],
    ['sin fecha de pesaje', { pesaje_fecha_snapshot: null }],
    ['fecha imposible', { pesaje_fecha_snapshot: '2026-02-30' }],
    ['peso infinito', { peso_promedio_g: Infinity }],
    ['peso cero', { peso_promedio_g: 0 }],
  ]
  it.each(incompletos)('no presenta %s como peso verificado', (_, cambios) => {
    expect(obtenerPesoVerificado({ ...indicador, ...cambios })).toBeNull()
  })
  it('sin indicador no inventa un pesaje', () => {
    expect(obtenerPesoVerificado(null)).toBeNull()
  })
})

describe('guia de crecimiento', () => {

  it('interpela peso, consumo acumulado y FCR entre puntos de la tabla', () => {
    const resultado = interpolarPuntoEnDia([
      { dia: 35, pesoEsperadoG: 2421, consumoAcumuladoG: 3483, fcrObjetivo: 1.44 },
      { dia: 42, pesoEsperadoG: 3100, consumoAcumuladoG: 5023, fcrObjetivo: 1.57 },
    ], 38.5)

    expect(resultado).toEqual({
      estado: 'calculado',
      pesoEsperadoG: 2760.5,
      consumoAcumuladoG: 4253,
      fcrObjetivo: 1.505,
    })
  })

  it('rechaza un día fuera del rango de la curva', () => {
    expect(interpolarPuntoEnDia([
      { dia: 35, pesoEsperadoG: 2421, consumoAcumuladoG: 3483, fcrObjetivo: 1.44 },
      { dia: 42, pesoEsperadoG: 3100, consumoAcumuladoG: 5023, fcrObjetivo: 1.57 },
    ], 43)).toEqual({ estado: 'fuera_de_rango' })
  })
})
