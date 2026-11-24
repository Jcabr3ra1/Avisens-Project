import { describe, expect, it } from 'vitest'
import { lecturaVigente, saludoDelDia, tiempoRelativo } from './tiempo'

const ahora = Date.parse('2026-11-21T15:00:00.000Z')
const minutos = (n: number) => ahora - n * 60_000

describe('tiempoRelativo', () => {
  it('menos de un minuto es "hace un momento"', () => {
    expect(tiempoRelativo(ahora - 20_000, ahora)).toBe('hace un momento')
  })

  it('una hora de reloj futura (reloj desajustado) no da números negativos', () => {
    expect(tiempoRelativo(ahora + 5 * 60_000, ahora)).toBe('hace un momento')
  })

  it('en minutos, horas y días', () => {
    expect(tiempoRelativo(minutos(5), ahora)).toBe('hace 5 min')
    expect(tiempoRelativo(minutos(59), ahora)).toBe('hace 59 min')
    expect(tiempoRelativo(minutos(60), ahora)).toBe('hace 1 hora')
    expect(tiempoRelativo(minutos(3 * 60), ahora)).toBe('hace 3 horas')
    expect(tiempoRelativo(minutos(24 * 60), ahora)).toBe('ayer')
    expect(tiempoRelativo(minutos(4 * 24 * 60), ahora)).toBe('hace 4 días')
  })
})

describe('lecturaVigente', () => {
  it('sin hora de lectura no es vigente', () => {
    expect(lecturaVigente(null, ahora)).toBe(false)
  })

  it('vigente hasta 30 minutos y vieja después', () => {
    expect(lecturaVigente(minutos(30), ahora)).toBe(true)
    expect(lecturaVigente(minutos(31), ahora)).toBe(false)
  })
})

describe('saludoDelDia', () => {
  it('cambia en la mañana, la tarde y la noche', () => {
    expect(saludoDelDia(6)).toBe('Buenos días')
    expect(saludoDelDia(11.9)).toBe('Buenos días')
    expect(saludoDelDia(12)).toBe('Buenas tardes')
    expect(saludoDelDia(18.5)).toBe('Buenas tardes')
    expect(saludoDelDia(19)).toBe('Buenas noches')
    expect(saludoDelDia(2)).toBe('Buenos días')
  })
})
