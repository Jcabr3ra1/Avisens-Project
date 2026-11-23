import { describe, expect, it } from 'vitest'
import type { LecturaClima } from '@features/clima/api/clima'
import { fraseClima, lecturaReciente } from './clima'

const ahora = Date.parse('2026-11-23T15:00:00.000Z')

function lectura(parcial: Partial<LecturaClima> = {}): LecturaClima {
  return {
    id: 1, granja_id: 1, fecha_hora: '2026-11-23T14:00:00.000Z', temperatura: 28.4, humedad: 60,
    precipitacion: 0, viento_kmh: 5, fuente: 'open-meteo', ...parcial,
  }
}

describe('lecturaReciente', () => {
  it('sin lecturas no hay clima', () => {
    expect(lecturaReciente([], ahora)).toBeNull()
  })

  it('toma la más nueva', () => {
    const nueva = lectura({ id: 2, fecha_hora: '2026-11-23T14:30:00.000Z' })
    expect(lecturaReciente([lectura(), nueva], ahora)).toBe(nueva)
  })

  it('una lectura de hace más de 6 horas ya no sirve', () => {
    expect(lecturaReciente([lectura({ fecha_hora: '2026-11-23T08:00:00.000Z' })], ahora)).toBeNull()
  })
})

describe('fraseClima', () => {
  it('sin clima vigente no escribe nada', () => {
    expect(fraseClima([], ahora)).toBeNull()
  })

  it('despejado, nublado y con lluvia', () => {
    expect(fraseClima([lectura()], ahora)).toBe('Exterior: 28 °C · Despejado')
    expect(fraseClima([lectura({ humedad: 95 })], ahora)).toBe('Exterior: 28 °C · Nublado')
    expect(fraseClima([lectura({ precipitacion: 2 })], ahora)).toBe('Exterior: 28 °C · Lluvia')
  })

  it('sin temperatura solo habla de cómo está el cielo', () => {
    expect(fraseClima([lectura({ temperatura: null })], ahora)).toBe('Exterior: Despejado')
  })
})
