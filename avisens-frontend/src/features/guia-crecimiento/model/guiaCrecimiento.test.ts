import { describe, expect, it } from 'vitest'
import {
  interpolarPuntoEnDia,
} from './guiaCrecimiento'

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
