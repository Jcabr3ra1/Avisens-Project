import { describe, expect, it } from 'vitest'
import {
  detallePorCriticidad,
  detallePorDesvio,
  detallePorSensores,
  detallePorTendencia,
  tonoPorAlertas,
  tonoPorDesvio,
  tonoPorMortalidad,
  tonoPorSensores,
} from './atencion'

describe('detallePorCriticidad', () => {
  it('dice "sin incidencias" cuando no hay nada', () => {
    expect(detallePorCriticidad(0, 0)).toBe('sin incidencias')
  })

  it('pluraliza según la cantidad', () => {
    expect(detallePorCriticidad(1, 0)).toBe('1 alta')
    expect(detallePorCriticidad(2, 0)).toBe('2 altas')
    expect(detallePorCriticidad(1, 1)).toBe('1 alta · 1 media')
    expect(detallePorCriticidad(0, 3)).toBe('3 medias')
  })
})

describe('detallePorTendencia', () => {
  it('avisa cuando no hay con qué comparar, en vez de inventar una flecha', () => {
    expect(detallePorTendencia(2.1, null)).toBe('primer registro')
    expect(detallePorTendencia(null, 1.8)).toBe('sin registro')
  })

  it('marca la dirección real del cambio', () => {
    expect(detallePorTendencia(2.1, 1.8)).toBe('↑ 0.3 vs. ayer')
    expect(detallePorTendencia(1.5, 2)).toBe('↓ 0.5 vs. ayer')
    expect(detallePorTendencia(2, 2)).toBe('= vs. ayer')
  })
})

describe('detallePorDesvio', () => {
  it('distingue "sin curva" de "en la curva"', () => {
    // Sin curva sembrada no hay comparación posible; un 0 % se leería como
    // "justo en la meta", que es una afirmación distinta.
    expect(detallePorDesvio(null)).toBe('sin curva objetivo')
    expect(detallePorDesvio(0)).toBe('en la curva')
  })

  it('antepone el signo cuando el desvío es positivo', () => {
    expect(detallePorDesvio(3.2)).toBe('+3.2% sobre la curva')
    expect(detallePorDesvio(-4)).toBe('-4% bajo la curva')
  })
})

describe('detallePorSensores', () => {
  it('resume el estado de los sensores', () => {
    expect(detallePorSensores(0, 0)).toBe('todos en rango')
    expect(detallePorSensores(2, 0)).toBe('2 fuera de rango')
    expect(detallePorSensores(1, 3)).toBe('1 fuera de rango · 3 sin señal')
  })
})

describe('tonos', () => {
  it('solo alarma por alertas cuando hay alguna', () => {
    expect(tonoPorAlertas(0)).toBe('ok')
    expect(tonoPorAlertas(1)).toBe('peligro')
  })

  it('marca la mortalidad desde el 2 %, y "info" si no hay dato', () => {
    expect(tonoPorMortalidad(null)).toBe('info')
    expect(tonoPorMortalidad(1.9)).toBe('ok')
    expect(tonoPorMortalidad(2)).toBe('advertencia')
  })

  it('da prioridad a los sensores fuera de rango sobre los caídos', () => {
    expect(tonoPorSensores(0, 0)).toBe('ok')
    expect(tonoPorSensores(0, 2)).toBe('advertencia')
    expect(tonoPorSensores(1, 5)).toBe('peligro')
  })

  it('mide el desvío por magnitud, sin importar el signo', () => {
    expect(tonoPorDesvio(null)).toBe('info')
    expect(tonoPorDesvio(4.9)).toBe('ok')
    expect(tonoPorDesvio(-5)).toBe('advertencia')
    expect(tonoPorDesvio(-12)).toBe('peligro')
    expect(tonoPorDesvio(12)).toBe('peligro')
  })
})
