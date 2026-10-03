import { describe, expect, it } from 'vitest'
import { calcularDiaObjetivo } from './interpolarDiaObjetivo'

describe('calcularDiaObjetivo', () => {
  const puntos = [
    { dia: 1, pesoEsperadoG: 100 },
    { dia: 3, pesoEsperadoG: 300 },
    { dia: 5, pesoEsperadoG: 500 }
  ]

  it('resuelve un peso exacto', () => {
    const resultado = calcularDiaObjetivo(puntos, 300)

    expect(resultado).toEqual({
      estado: 'calculado',
      diaObjetivo: 3,
      diaInterpolado: 3,
    })
  })

  it('interpola un peso entre dos puntos con día entero', () => {
  const resultado = calcularDiaObjetivo(puntos, 200)

  expect(resultado).toEqual({
    estado: 'calculado',
    diaObjetivo: 2,
    diaInterpolado: 2,
  })
})

  it('aplica techo cuando el día interpolado tiene decimales', () => {
    const resultado = calcularDiaObjetivo(puntos, 250)

    expect(resultado).toEqual({
      estado: 'calculado',
      diaObjetivo: 3,
      diaInterpolado: 2.5,
    })
  })
 it('devuelve fuera de rango para un peso menor', () => {
    const resultado = calcularDiaObjetivo(puntos, 50)

    expect(resultado).toEqual({
      estado: 'fuera_de_rango',
    })
  })

  it('devuelve fuera de rango para un peso mayor', () => {
    const resultado = calcularDiaObjetivo(puntos, 600)

    expect(resultado).toEqual({
      estado: 'fuera_de_rango',
    })
  })

  it('devuelve datos insuficientes con menos de dos puntos', () => {
    const resultado = calcularDiaObjetivo([puntos[0]], 100)

    expect(resultado).toEqual({
      estado: 'datos_insuficientes',
    })
  })

})