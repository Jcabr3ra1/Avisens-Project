import { describe, expect, it } from 'vitest'
import { gramosALibras, librasAGramos } from './pesoObjetivo'

describe('librasAGramos', () => {
  it('convierte 1 libra a 454 gramos redondeados', () => {
    expect(librasAGramos(1)).toBe(454)
  })

  it('convierte 5.5 libras al gramo entero más cercano', () => {
    expect(librasAGramos(5.5)).toBe(Math.round(5.5 * 453.59237))
  })

  it('convierte 0 libras a 0 gramos', () => {
    expect(librasAGramos(0)).toBe(0)
  })

  it('siempre redondea a un entero, sin decimales de gramo', () => {
    expect(Number.isInteger(librasAGramos(3.3))).toBe(true)
  })
})

describe('gramosALibras', () => {
  it('convierte 2500 gramos a libras', () => {
    expect(gramosALibras(2500)).toBeCloseTo(5.5116, 3)
  })

  it('convierte 0 gramos a 0 libras', () => {
    expect(gramosALibras(0)).toBe(0)
  })
})

describe('ida y vuelta', () => {
  it('convertir y volver a convertir queda cerca del valor original', () => {
    const libras = 6.2
    const gramos = librasAGramos(libras)
    expect(gramosALibras(gramos)).toBeCloseTo(libras, 2)
  })
})
