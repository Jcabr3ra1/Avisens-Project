import { describe, expect, it } from 'vitest'
import { errorDeCambio, fortaleza } from './perfil'

describe('errorDeCambio', () => {
  it('pide la contraseña actual', () => {
    expect(errorDeCambio('', 'NuevaClave1', 'NuevaClave1')).toBe('Escribe tu contraseña actual.')
  })

  it('exige el mínimo de caracteres', () => {
    expect(errorDeCambio('actual', 'corta', 'corta')).toContain('al menos 8')
  })

  it('no deja repetir la actual', () => {
    expect(errorDeCambio('MismaClave1', 'MismaClave1', 'MismaClave1')).toContain('distinta')
  })

  it('verifica que la confirmación coincida', () => {
    expect(errorDeCambio('actual', 'NuevaClave1', 'NuevaClave2')).toBe('Las contraseñas nuevas no coinciden.')
  })

  it('sin errores devuelve null', () => {
    expect(errorDeCambio('actual', 'NuevaClave1', 'NuevaClave1')).toBeNull()
  })
})

describe('fortaleza', () => {
  it('califica de muy corta a fuerte', () => {
    expect(fortaleza('').nivel).toBe(0)
    expect(fortaleza('abc').etiqueta).toBe('Muy corta')
    expect(fortaleza('abcdefgh').etiqueta).toBe('Débil')
    expect(fortaleza('abcdefghijkl').etiqueta).toBe('Aceptable')
    expect(fortaleza('Granja2026Avisens').etiqueta).toBe('Fuerte')
  })
})
