import { describe, expect, it } from 'vitest'
import { siguienteVersion } from './version'

describe('siguienteVersion', () => {
  it('propone el siguiente parche de la versión más alta', () => {
    expect(siguienteVersion(['1.0.9', '1.1.1', '1.0.10'])).toBe('1.1.2')
    expect(siguienteVersion([])).toBe('1.0.0')
    expect(siguienteVersion(['beta'])).toBe('1.0.0')
  })
})
