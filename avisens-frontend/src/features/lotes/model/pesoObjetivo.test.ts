import { describe, expect, it } from 'vitest'
import { gramosALibras, librasAGramos, pesoAEnviar, validarPesoObjetivo } from './pesoObjetivo'

describe('validación del peso que se envía al plan', () => {
  it('acepta coma y punto y envía gramos enteros positivos', () => {
    expect(validarPesoObjetivo(null, true, '5,50')).toBe(2495)
    expect(validarPesoObjetivo(null, true, ' 5.50 ')).toBe(2495)
    expect(validarPesoObjetivo(null, true, ',5')).toBe(227)
  })

  it.each(['0', '-1', '', ' ', 'NaN', 'Infinity', '1e999', '0x10', '0,000001', '1,2,3'])('rechaza %s sin enviarlo al servidor', (texto) => {
    expect(validarPesoObjetivo(null, true, texto)).toBeNull()
  })

  it('conserva un objetivo original exactamente en el mínimo', () => {
    const minimo = gramosALibras(1000)
    expect(validarPesoObjetivo(1000, false, '2.20', minimo)).toBe(1000)
    expect(validarPesoObjetivo(1000, true, '2.20', minimo)).toBeNull()
    expect(validarPesoObjetivo(null, true, '2.21', minimo)).toBe(1002)
  })
})

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

describe('pesoAEnviar', () => {
  it('sin editar, reenvía el gramo original tal cual -- sin pasar por libras', () => {
    // 2500 g -> "5.51" lb -> librasAGramos(5.51) = 2499: por eso no debe
    // usarse esa ruta cuando el usuario no tocó el campo.
    const libras = Number(gramosALibras(2500).toFixed(2))
    expect(pesoAEnviar(2500, false, libras)).toBe(2500)
  })

  it('editado, convierte lo que hay en el campo aunque coincida con el original', () => {
    const libras = Number(gramosALibras(2500).toFixed(2))
    expect(pesoAEnviar(2500, true, libras)).toBe(librasAGramos(libras))
  })

  it('sin peso previo (plan nuevo), siempre convierte lo escrito', () => {
    expect(pesoAEnviar(null, false, 5.51)).toBe(librasAGramos(5.51))
  })
})
