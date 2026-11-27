import { describe, expect, it } from 'vitest'
import { haceCuanto } from './tiempoRelativo'

const base = new Date('2026-11-11T10:00:00')
const despues = (segundos: number) => new Date(base.getTime() + segundos * 1000)

describe('haceCuanto', () => {
  it('los primeros segundos dicen «justo ahora»', () => {
    expect(haceCuanto(base, despues(0))).toBe('justo ahora')
    expect(haceCuanto(base, despues(4))).toBe('justo ahora')
  })

  it('cuenta segundos, minutos y horas', () => {
    expect(haceCuanto(base, despues(12))).toBe('hace 12 s')
    expect(haceCuanto(base, despues(60))).toBe('hace 1 min')
    expect(haceCuanto(base, despues(59 * 60))).toBe('hace 59 min')
    expect(haceCuanto(base, despues(3600))).toBe('hace 1 hora')
    expect(haceCuanto(base, despues(3 * 3600))).toBe('hace 3 horas')
  })

  it('un reloj adelantado no da tiempos negativos', () => {
    expect(haceCuanto(base, despues(-30))).toBe('justo ahora')
  })
})
