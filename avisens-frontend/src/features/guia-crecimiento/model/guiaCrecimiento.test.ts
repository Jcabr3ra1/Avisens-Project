import { describe, expect, it } from 'vitest'
import {
  diaDeVidaParaFecha,
  evaluarGuia,
  fechaParaDiaVida,
  gramosALibras,
  interpolarPuntoEnDia,
  librasAGramos,
  proyectarPesoOrientativo,
} from './guiaCrecimiento'

const puntos = [
  { dia: 1, pesoEsperadoG: 100 },
  { dia: 3, pesoEsperadoG: 300 },
  { dia: 5, pesoEsperadoG: 500 },
]

describe('guia de crecimiento', () => {
  it('convierte libras y gramos sin perder precision', () => {
    expect(librasAGramos(1)).toBeCloseTo(453.59237, 5)
    expect(gramosALibras(453.59237)).toBeCloseTo(1, 10)
  })

  it('convierte fecha y dia con el dia de ingreso como dia 1', () => {
    expect(fechaParaDiaVida('2026-08-12', 1)).toBe('2026-08-12')
    expect(fechaParaDiaVida('2026-08-12', 42)).toBe('2026-09-22')
    expect(diaDeVidaParaFecha('2026-08-12', '2026-08-12')).toBe(1)
    expect(diaDeVidaParaFecha('2026-08-12', '2026-08-13')).toBe(2)
  })

  it('distingue alcanzable, justo y no alcanzable', () => {
    expect(evaluarGuia(puntos, 300, 3, 1, true).estado).toBe('justo')
    expect(evaluarGuia(puntos, 300, 5, 1, true).estado).toBe('calculado')
    expect(evaluarGuia(puntos, 300, 4, 1, true).estado).toBe('justo')
    expect(evaluarGuia(puntos, 300, 2, 1, true).estado).toBe('no_alcanzable')
  })

  it('detecta curva ausente, plazo vencido y datos insuficientes', () => {
    expect(evaluarGuia(puntos, 300, 5, 1, false).estado).toBe('sin_curva')
    expect(evaluarGuia(puntos, 300, 2, 3, true).estado).toBe('plazo_vencido')
    expect(evaluarGuia([puntos[0]], 100, 1, 1, true).estado).toBe('datos_insuficientes')
  })

  it('proyecta peso orientativo con el factor real', () => {
    expect(proyectarPesoOrientativo(90, 100, 300)).toBe(270)
    expect(proyectarPesoOrientativo(90, 0, 300)).toBeNull()
  })

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
