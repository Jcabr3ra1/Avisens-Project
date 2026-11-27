import { describe, expect, it } from 'vitest'
import { pasoAcotado, pasoDesdeTecla } from './pasos'

describe('navegación de pasos en la landing', () => {
  it('acota el índice dentro de los límites disponibles', () => {
    expect(pasoAcotado(-2, 3)).toBe(0)
    expect(pasoAcotado(1, 3)).toBe(1)
    expect(pasoAcotado(9, 3)).toBe(2)
    expect(pasoAcotado(0, 0)).toBe(0)
  })

  it('navega con flechas, Inicio y Fin sin salirse del rango', () => {
    expect(pasoDesdeTecla('ArrowRight', 0, 3)).toBe(1)
    expect(pasoDesdeTecla('ArrowRight', 2, 3)).toBe(2)
    expect(pasoDesdeTecla('ArrowLeft', 2, 3)).toBe(1)
    expect(pasoDesdeTecla('ArrowLeft', 0, 3)).toBe(0)
    expect(pasoDesdeTecla('ArrowDown', 1, 4)).toBe(2)
    expect(pasoDesdeTecla('ArrowUp', 1, 4)).toBe(0)
    expect(pasoDesdeTecla('Home', 3, 4)).toBe(0)
    expect(pasoDesdeTecla('End', 0, 4)).toBe(3)
    expect(pasoDesdeTecla('Enter', 1, 4)).toBeNull()
  })
})
