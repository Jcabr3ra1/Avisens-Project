import { describe, expect, it } from 'vitest'
import {
  colorDeEdad, escalaDelPollito, estadoDeLampara, etiquetaDeKpi, faseDelDia,
  nivelDelTermometro, pollitosVisibles, posicionDelAstro, posicionesDePollitos,
} from './escenaGalpon'
import type { KpiGranja } from './resumenGranja'

const kpi = (id: KpiGranja['id'], valor: string): KpiGranja => ({
  id, valor, etiqueta: '', detalle: '', progreso: null, destino: '/granjas',
})

describe('reloj de la escena', () => {
  it('cambia de fase según la hora local', () => {
    expect(faseDelDia(4)).toBe('noche')
    expect(faseDelDia(5)).toBe('amanecer')
    expect(faseDelDia(7)).toBe('dia')
    expect(faseDelDia(16.9)).toBe('dia')
    expect(faseDelDia(17)).toBe('tarde')
    expect(faseDelDia(19)).toBe('noche')
    expect(faseDelDia(23.5)).toBe('noche')
  })

  it('el sol cruza el cielo de izquierda a derecha y la luna lo hace de noche', () => {
    const mañana = posicionDelAstro(8)
    const tarde = posicionDelAstro(16)
    expect(mañana.tipo).toBe('sol')
    expect(tarde.tipo).toBe('sol')
    expect(tarde.x).toBeGreaterThan(mañana.x)
    expect(posicionDelAstro(23).tipo).toBe('luna')
    expect(posicionDelAstro(2).tipo).toBe('luna')
  })

  it('el astro siempre queda dentro del cielo y más alto al mediodía', () => {
    for (let hora = 0; hora < 24; hora += 0.5) {
      const { x, y } = posicionDelAstro(hora)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
    expect(posicionDelAstro(12).y).toBeLessThan(posicionDelAstro(7).y)
  })

  it('el astro nunca baja hasta la altura del título', () => {
    for (let hora = 0; hora < 24; hora += 0.25) {
      expect(posicionDelAstro(hora).y).toBeLessThanOrEqual(34)
      expect(posicionDelAstro(hora).y).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('bandada', () => {
  it('dibuja pollitos en proporción a las aves sin llenar la escena', () => {
    expect(pollitosVisibles(0)).toBe(0)
    expect(pollitosVisibles(1)).toBe(3)
    expect(pollitosVisibles(500)).toBeGreaterThanOrEqual(10)
    expect(pollitosVisibles(500)).toBeLessThanOrEqual(16)
    expect(pollitosVisibles(1_000_000)).toBe(16)
    expect(pollitosVisibles(5000)).toBeGreaterThan(pollitosVisibles(500) - 1)
  })

  it('los pollitos crecen con los días del lote y no se encogen', () => {
    expect(escalaDelPollito(0)).toBeLessThan(escalaDelPollito(21))
    expect(escalaDelPollito(21)).toBeLessThan(escalaDelPollito(42))
    expect(escalaDelPollito(120)).toBe(escalaDelPollito(42))
    expect(escalaDelPollito(null)).toBeGreaterThan(escalaDelPollito(0))
    expect(escalaDelPollito(-3)).toBe(escalaDelPollito(0))
  })

  it('el plumaje pasa de amarillo a blanco con la edad', () => {
    expect(colorDeEdad(0)).toBe(0)
    expect(colorDeEdad(42)).toBe(1)
    expect(colorDeEdad(21)).toBeCloseTo(0.5, 5)
    expect(colorDeEdad(null)).toBe(0.5)
  })

  it('reparte los pollitos siempre igual para el mismo lote', () => {
    const una = posicionesDePollitos(12, 7)
    const otra = posicionesDePollitos(12, 7)
    expect(una).toEqual(otra)
    expect(posicionesDePollitos(12, 8)).not.toEqual(una)
    expect(una).toHaveLength(12)
  })

  it('mantiene los pollitos dentro del piso y los de atrás más chicos', () => {
    const grupo = posicionesDePollitos(16, 3)
    for (const pollito of grupo) {
      expect(pollito.x).toBeGreaterThanOrEqual(0)
      expect(pollito.x).toBeLessThanOrEqual(1)
      expect(pollito.fila).toBeGreaterThanOrEqual(0)
      expect(pollito.fila).toBeLessThanOrEqual(1)
      expect(pollito.retraso).toBeGreaterThanOrEqual(0)
      expect(pollito.retraso).toBeLessThan(3)
    }
    const atras = grupo.filter((p) => p.fila < 0.3)
    const adelante = grupo.filter((p) => p.fila > 0.7)
    if (atras.length > 0 && adelante.length > 0) {
      expect(Math.max(...atras.map((p) => p.perspectiva))).toBeLessThan(Math.min(...adelante.map((p) => p.perspectiva)))
    }
  })
})

describe('objetos con dato real', () => {
  it('la lámpara del techo refleja el tono de la granja', () => {
    expect(estadoDeLampara('ok')).toEqual({ color: 'ok', pulsa: false })
    expect(estadoDeLampara('atencion')).toEqual({ color: 'atencion', pulsa: true })
    expect(estadoDeLampara('critico')).toEqual({ color: 'critico', pulsa: true })
  })

  it('el termómetro sube con la temperatura medida y no inventa una lectura', () => {
    expect(nivelDelTermometro(null)).toBeNull()
    expect(nivelDelTermometro(10)).toBe(0)
    expect(nivelDelTermometro(45)).toBe(1)
    expect(nivelDelTermometro(27.5)).toBeCloseTo(0.5, 5)
  })

  it('escribe la etiqueta de cada indicador con su plural', () => {
    expect(etiquetaDeKpi(kpi('aves', '500'), 9)).toBe('500 aves · día 9')
    expect(etiquetaDeKpi(kpi('aves', '500'), null)).toBe('500 aves')
    expect(etiquetaDeKpi(kpi('aves', '1'), null)).toBe('1 ave')
    expect(etiquetaDeKpi(kpi('alertas', '0'), null)).toBe('Sin alertas')
    expect(etiquetaDeKpi(kpi('alertas', '1'), null)).toBe('1 alerta')
    expect(etiquetaDeKpi(kpi('alertas', '3'), null)).toBe('3 alertas')
    expect(etiquetaDeKpi(kpi('sensores', '1/1'), null)).toBe('1/1 sensores')
    expect(etiquetaDeKpi(kpi('galpones', '2/3'), null)).toBe('2/3 galpones con lote')
  })
})
