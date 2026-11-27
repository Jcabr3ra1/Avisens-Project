import { describe, expect, it } from 'vitest'
import type { LecturaClima } from '@features/clima/api/clima'
import { climaVisual } from './climaVisual'

const AHORA = Date.parse('2026-10-25T12:00:00Z')

const lectura = (cambios: Partial<LecturaClima>): LecturaClima => ({
  id: 1, granja_id: 1, fecha_hora: '2026-10-25T11:30:00Z', temperatura: 24, humedad: 60,
  precipitacion: 0, viento_kmh: 5, fuente: 'open-meteo', ...cambios,
})

describe('clima visual de la granja', () => {
  it('sin lecturas o con datos viejos asume cielo despejado', () => {
    expect(climaVisual([], AHORA)).toBe('despejado')
    expect(climaVisual([lectura({ fecha_hora: '2026-10-25T02:00:00Z', precipitacion: 5 })], AHORA)).toBe('despejado')
  })

  it('detecta lluvia por la precipitación', () => {
    expect(climaVisual([lectura({ precipitacion: 1.4 })], AHORA)).toBe('lluvia')
  })

  it('detecta cielo cubierto por la humedad alta', () => {
    expect(climaVisual([lectura({ humedad: 93 })], AHORA)).toBe('nublado')
  })

  it('usa la lectura más reciente', () => {
    const lecturas = [
      lectura({ id: 1, fecha_hora: '2026-10-25T09:00:00Z', precipitacion: 4 }),
      lectura({ id: 2, fecha_hora: '2026-10-25T11:45:00Z', precipitacion: 0, humedad: 55 }),
    ]
    expect(climaVisual(lecturas, AHORA)).toBe('despejado')
  })
})
