import { describe, expect, it } from 'vitest'
import type { Prospecto } from '../api/prospectos'
import { aProspectoVista, PUNTAJE_MAXIMO, RANGOS_PUNTAJE } from './prospectoVista'

describe('la escala de puntaje refleja la del backend', () => {
  it('el máximo son 12 puntos, no 16', () => {
    expect(PUNTAJE_MAXIMO).toBe(12)
  })

  it('los rangos no contradicen a la etiqueta', () => {
    expect(RANGOS_PUNTAJE.caliente).toBe('8 - 12 pts')
    expect(RANGOS_PUNTAJE.tibio).toBe('5 - 7 pts')
    expect(RANGOS_PUNTAJE.frio).toBe('0 - 4 pts')
  })

  it('ningún rango se pasa del máximo', () => {
    const tope = Number(RANGOS_PUNTAJE.caliente.match(/(\d+) pts/)?.[1])
    expect(tope).toBe(PUNTAJE_MAXIMO)
  })
})

describe('la etapa distingue un cierre ganado de uno perdido', () => {
  const base = { id: 1, estado: 'cerrado', resultado_cierre: 'ganado', clasificacion: 'caliente', ultima_actividad: '2026-10-01T00:00:00Z', fecha_inicio: '2026-10-01T00:00:00Z' } as Prospecto

  it('un cierre ganado es un cliente', () => {
    expect(aProspectoVista(base).etapa).toBe('cerrado')
  })

  it('un cierre perdido es descartado, no cliente', () => {
    expect(aProspectoVista({ ...base, resultado_cierre: 'perdido' }).etapa).toBe('descartado')
  })
})
