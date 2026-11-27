import { describe, expect, it } from 'vitest'
import { juicioAlimento, juicioMortalidad, juicioPeso, juicioTemperatura } from './juicios'

describe('juicioPeso', () => {
  it('sin comparación no juzga', () => {
    expect(juicioPeso(null)).toBeNull()
    expect(juicioPeso(undefined)).toBeNull()
    expect(juicioPeso(Number.NaN)).toBeNull()
  })

  it('dentro del margen o por encima va bien', () => {
    expect(juicioPeso(0)).toEqual({ palabra: 'En rango', tono: 'ok' })
    expect(juicioPeso(-3)).toEqual({ palabra: 'En rango', tono: 'ok' })
    expect(juicioPeso(3)).toEqual({ palabra: 'En rango', tono: 'ok' })
    expect(juicioPeso(8)).toEqual({ palabra: 'Sobre la meta', tono: 'ok' })
  })

  it('por debajo del margen está bajo, y muy bajo pasado el 10 %', () => {
    expect(juicioPeso(-3.1)).toEqual({ palabra: 'Bajo', tono: 'atencion' })
    expect(juicioPeso(-10)).toEqual({ palabra: 'Bajo', tono: 'atencion' })
    expect(juicioPeso(-10.1)).toEqual({ palabra: 'Muy bajo', tono: 'critico' })
  })
})

describe('juicioMortalidad', () => {
  it('sin dato no juzga', () => {
    expect(juicioMortalidad(null)).toBeNull()
  })

  it('cero y menos de 2 % es normal', () => {
    expect(juicioMortalidad(0)).toEqual({ palabra: 'Normal', tono: 'ok' })
    expect(juicioMortalidad(1.9)).toEqual({ palabra: 'Normal', tono: 'ok' })
  })

  it('de 2 a menos de 5 % es un poco alta y desde 5 % es alta', () => {
    expect(juicioMortalidad(2)).toEqual({ palabra: 'Elevada', tono: 'atencion' })
    expect(juicioMortalidad(4.9)).toEqual({ palabra: 'Elevada', tono: 'atencion' })
    expect(juicioMortalidad(5)).toEqual({ palabra: 'Alta', tono: 'critico' })
  })
})

describe('juicioAlimento', () => {
  it('sin comparación no juzga', () => {
    expect(juicioAlimento(null)).toBeNull()
  })

  it('hasta 0,05 kg sobre lo esperado come bien; más es de más', () => {
    expect(juicioAlimento(-0.2)).toEqual({ palabra: 'En rango', tono: 'ok' })
    expect(juicioAlimento(0.05)).toEqual({ palabra: 'En rango', tono: 'ok' })
    expect(juicioAlimento(0.06)).toEqual({ palabra: 'Alta', tono: 'atencion' })
  })
})

describe('juicioTemperatura', () => {
  const rango = { min: 24, max: 30 }

  it('dentro del rango es "Bien", incluidos los bordes', () => {
    expect(juicioTemperatura({ valor: 27, ...rango }).palabra).toBe('En rango')
    expect(juicioTemperatura({ valor: 24, ...rango }).palabra).toBe('En rango')
    expect(juicioTemperatura({ valor: 30, ...rango }).palabra).toBe('En rango')
  })

  it('sobre el máximo es calor y bajo el mínimo es frío', () => {
    expect(juicioTemperatura({ valor: 31, ...rango })).toEqual({ palabra: 'Alta', tono: 'atencion' })
    expect(juicioTemperatura({ valor: 20, ...rango })).toEqual({ palabra: 'Baja', tono: 'atencion' })
  })

  it('cuando el medidor lo marca crítico sube a "mucho"', () => {
    expect(juicioTemperatura({ valor: 36, ...rango, severo: true })).toEqual({ palabra: 'Muy alta', tono: 'critico' })
    expect(juicioTemperatura({ valor: 15, ...rango, severo: true })).toEqual({ palabra: 'Muy baja', tono: 'critico' })
  })

  it('crítico pero dentro del rango no se dramatiza', () => {
    expect(juicioTemperatura({ valor: 27, ...rango, severo: true }).palabra).toBe('En rango')
  })

  it('sin rango de referencia o sin valor no inventa un juicio', () => {
    expect(juicioTemperatura({ valor: 27, min: null, max: null })).toEqual({ palabra: 'Sin rango', tono: 'sin_datos' })
    expect(juicioTemperatura({ valor: null, ...rango })).toEqual({ palabra: 'Sin rango', tono: 'sin_datos' })
  })
})
