import { describe, expect, it } from 'vitest'
import { PUNTAJE_MAXIMO, RANGOS_PUNTAJE } from './prospectoVista'

describe('la escala de puntaje refleja la del backend', () => {
  it('el máximo son 12 puntos, no 16', () => {
    expect(PUNTAJE_MAXIMO).toBe(12)
  })

  it('los rangos no contradicen a la etiqueta', () => {
    expect(RANGOS_PUNTAJE.caliente).toBe('8 - 12 pts')
    expect(RANGOS_PUNTAJE.tibio).toBe('5 - 7 pts')
    expect(RANGOS_PUNTAJE.frio).toBe('0 - 4 pts')
  })

  it('ningún rango se pasa del máximo', () => {
    const tope = Number(RANGOS_PUNTAJE.caliente.match(/(\d+) pts/)?.[1])
    expect(tope).toBe(PUNTAJE_MAXIMO)
  })
})
