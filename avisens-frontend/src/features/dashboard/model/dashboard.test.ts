import { describe, expect, it } from 'vitest'
import { diasDeVida } from '@shared/utils/fechas'
import { calcularDiaLote } from './dashboard'
import { diasDeVida as diasDeVidaGranjas } from '@features/granjas/model/estructura'

describe('QA-02: la edad del lote es la misma en todas las pantallas', () => {
  const hoy = new Date(2026, 9, 31, 7, 0)

  it('Resumen y Granjas cuentan el mismo día para el lote de la prueba', () => {
    const ingreso = '2026-10-15T00:00:00.000Z'
    expect(diasDeVida(ingreso, hoy)).toBe(17)
    expect(diasDeVidaGranjas(ingreso, hoy)).toBe(diasDeVida(ingreso, hoy))
  })

  it('el cálculo del Resumen es el mismo que el de Granjas, para cualquier fecha', () => {
    for (const ingreso of ['2026-10-01', '2026-10-15T00:00:00.000Z', '2026-10-30T23:00:00.000Z']) {
      expect(calcularDiaLote(ingreso)).toBe(diasDeVidaGranjas(ingreso))
    }
  })

  it('el día de ingreso cuenta como el día 1', () => {
    expect(diasDeVida('2026-10-31', hoy)).toBe(1)
  })
})
