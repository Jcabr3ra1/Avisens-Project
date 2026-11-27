import { describe, expect, it } from 'vitest'
import {
  debeBloquearPegadoEnInput,
  debeBloquearTeclaEnInput,
  esPegadoNumericoValido,
  esTeclaNumericaBloqueada,
} from './protegerInputsNumericos'

describe('protegerInputsNumericos', () => {
  it('bloquea e, E y + en cualquier campo numérico', () => {
    expect(esTeclaNumericaBloqueada('e', { negativos: true, enteros: false })).toBe(true)
    expect(esTeclaNumericaBloqueada('E', { negativos: true, enteros: false })).toBe(true)
    expect(esTeclaNumericaBloqueada('+', { negativos: true, enteros: false })).toBe(true)
    expect(esTeclaNumericaBloqueada('-', { negativos: true, enteros: false })).toBe(false)
    expect(esTeclaNumericaBloqueada('-', { negativos: false, enteros: false })).toBe(true)
    expect(esTeclaNumericaBloqueada('.', { negativos: false, enteros: true })).toBe(true)
    expect(esTeclaNumericaBloqueada(',', { negativos: false, enteros: true })).toBe(true)
    expect(esTeclaNumericaBloqueada('.', { negativos: false, enteros: false })).toBe(false)
  })

  it('valida texto pegado según si admite negativos y decimales', () => {
    expect(esPegadoNumericoValido('1250', { negativos: false, enteros: true })).toBe(true)
    expect(esPegadoNumericoValido('1e5', { negativos: false, enteros: false })).toBe(false)
    expect(esPegadoNumericoValido('-20', { negativos: false, enteros: false })).toBe(false)
    expect(esPegadoNumericoValido('-20.5', { negativos: true, enteros: false })).toBe(true)
    expect(esPegadoNumericoValido('12.5', { negativos: false, enteros: true })).toBe(false)
    expect(esPegadoNumericoValido('12.5', { negativos: false, enteros: false })).toBe(true)
    expect(esPegadoNumericoValido('abc', { negativos: true, enteros: false })).toBe(false)
  })

  it('previene teclear e, +, -, . y , en un input entero positivo', () => {
    const input = { type: 'number', min: '0', step: '1', inputMode: 'numeric' }

    for (const key of ['e', 'E', '+', '-', '.', ',']) {
      expect(debeBloquearTeclaEnInput(input, key)).toBe(true)
    }
    expect(debeBloquearTeclaEnInput(input, '5')).toBe(false)
    expect(debeBloquearPegadoEnInput(input, '1e5')).toBe(true)
    expect(debeBloquearPegadoEnInput(input, '-10')).toBe(true)
    expect(debeBloquearPegadoEnInput(input, '12.5')).toBe(true)
    expect(debeBloquearPegadoEnInput(input, '1500')).toBe(false)
  })

  it('permite signo negativo y decimales en coordenadas o umbrales con min negativo', () => {
    const input = { type: 'number', min: '-90', step: 'any', inputMode: 'decimal' }

    expect(debeBloquearTeclaEnInput(input, '-')).toBe(false)
    expect(debeBloquearTeclaEnInput(input, '.')).toBe(false)
    expect(debeBloquearTeclaEnInput(input, 'e')).toBe(true)
    expect(debeBloquearTeclaEnInput(input, '+')).toBe(true)
    expect(debeBloquearPegadoEnInput(input, '-74.0817')).toBe(false)
    expect(debeBloquearPegadoEnInput(input, '1e3')).toBe(true)
  })

  it('no interfiere con inputs de texto normales', () => {
    const input = { type: 'text', min: '', step: '', inputMode: '' }
    expect(debeBloquearTeclaEnInput(input, 'e')).toBe(false)
    expect(debeBloquearPegadoEnInput(input, 'hola@123')).toBe(false)
  })
})
