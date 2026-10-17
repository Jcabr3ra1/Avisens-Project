import { describe, expect, it } from 'vitest'
import { haceCuanto } from './conectividad'

describe('haceCuanto', () => {
  const ahora = new Date('2026-10-17T12:00:00Z')
  const hace = (minutos: number) => new Date(ahora.getTime() - minutos * 60_000).toISOString()

  it('expresa el tiempo sin reportar en la unidad más útil', () => {
    expect(haceCuanto(hace(20), ahora)).toBe('Sin reportar hace 20 min')
    expect(haceCuanto(hace(250), ahora)).toBe('Sin reportar hace 4 h')
    expect(haceCuanto(hace(60 * 24), ahora)).toBe('Sin reportar hace 1 día')
    expect(haceCuanto(hace(60 * 24 * 3), ahora)).toBe('Sin reportar hace 3 días')
  })

  it('distingue al que nunca ha reportado', () => {
    expect(haceCuanto(null, ahora)).toBe('Nunca ha reportado')
  })
})
