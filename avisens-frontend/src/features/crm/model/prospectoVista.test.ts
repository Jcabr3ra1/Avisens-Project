import { describe, expect, it } from 'vitest'
import { PUNTAJE_MAXIMO, RANGOS_PUNTAJE } from './prospectoVista'

describe('la escala de puntaje refleja la del backend', () => {
  it('el máximo son 12 puntos, no 16', () => {
    // NECESIDAD 4 + PRESUPUESTO 3 + MOMENTO 3 + AUTORIDAD 2. Con 16 un
    // prospecto de 9 se leía como un 56 % cuando es un 75 %.
    expect(PUNTAJE_MAXIMO).toBe(12)
  })

  it('los rangos no contradicen a la etiqueta', () => {
    // Umbrales reales: caliente >= 8, tibio >= 5. Antes decía que caliente
    // empezaba en 12, así que un prospecto de 9 salía con la etiqueta Caliente
    // y un rango que lo desmentía en la misma línea.
    expect(RANGOS_PUNTAJE.caliente).toBe('8 - 12 pts')
    expect(RANGOS_PUNTAJE.tibio).toBe('5 - 7 pts')
    expect(RANGOS_PUNTAJE.frio).toBe('0 - 4 pts')
  })

  it('ningún rango se pasa del máximo', () => {
    const tope = Number(RANGOS_PUNTAJE.caliente.match(/(\d+) pts/)?.[1])
    expect(tope).toBe(PUNTAJE_MAXIMO)
  })
})
