import { describe, expect, it, vi } from 'vitest'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { frescuraLecturas, posicionPorcentaje, sensoresUbicados } from './plano'

function sensor(parcial: Partial<SensorVista> = {}): SensorVista {
  return {
    id: 1, codigo: 'S-1', tipo: 'temperatura', unidad: '°C',
    variableUmbral: 'temperatura', valor: 27, minUmbral: 25, maxUmbral: 29,
    estado: 'optimo', ultimaLecturaTs: null, x: null, y: null, ...parcial,
  }
}

describe('sensoresUbicados', () => {
  it('descarta los sensores sin coordenadas', () => {
    const lista = [
      sensor({ id: 1, x: 3, y: 10 }),
      sensor({ id: 2, x: null, y: 10 }),
      sensor({ id: 3, x: 3, y: null }),
    ]
    expect(sensoresUbicados(lista).map((s) => s.id)).toEqual([1])
  })

  it('conserva el sensor en el origen: 0 es una coordenada válida', () => {
    expect(sensoresUbicados([sensor({ x: 0, y: 0 })])).toHaveLength(1)
  })
})

describe('posicionPorcentaje', () => {
  it('pone el largo en horizontal y el ancho en vertical', () => {
    const s = sensoresUbicados([sensor({ x: 6, y: 30 })])[0]
    expect(posicionPorcentaje(s, 12, 60)).toEqual({ left: '50%', top: '50%' })
  })

  it('recorta a los bordes para que la etiqueta no se salga del plano', () => {
    const enElOrigen = sensoresUbicados([sensor({ x: 0, y: 0 })])[0]
    expect(posicionPorcentaje(enElOrigen, 12, 60)).toEqual({ left: '4%', top: '4%' })

    const fuera = sensoresUbicados([sensor({ x: 99, y: 99 })])[0]
    expect(posicionPorcentaje(fuera, 12, 60)).toEqual({ left: '96%', top: '96%' })
  })
})

describe('frescuraLecturas', () => {
  it('no se declara en vivo cuando ningún sensor ha reportado', () => {
    expect(frescuraLecturas([sensor()])).toEqual({ texto: 'sin lecturas', enVivo: false })
    expect(frescuraLecturas([])).toEqual({ texto: 'sin lecturas', enVivo: false })
  })

  it('toma la lectura más reciente del galpón', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'))
    const lista = [
      sensor({ id: 1, ultimaLecturaTs: new Date('2026-08-31T09:00:00.000Z').getTime() }),
      sensor({ id: 2, ultimaLecturaTs: new Date('2026-08-31T11:58:00.000Z').getTime() }),
    ]
    expect(frescuraLecturas(lista)).toEqual({ texto: 'hace 2 min', enVivo: true })
    vi.useRealTimers()
  })

  it('deja de estar en vivo pasados 10 minutos', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'))
    const viejo = sensor({ ultimaLecturaTs: new Date('2026-08-31T11:45:00.000Z').getTime() })
    expect(frescuraLecturas([viejo])).toEqual({ texto: 'hace 15 min', enVivo: false })
    vi.useRealTimers()
  })

  it('escala la unidad según la antigüedad', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'))
    const enHoras = sensor({ ultimaLecturaTs: new Date('2026-08-31T09:00:00.000Z').getTime() })
    const enDias = sensor({ ultimaLecturaTs: new Date('2026-08-28T12:00:00.000Z').getTime() })
    expect(frescuraLecturas([enHoras]).texto).toBe('hace 3 h')
    expect(frescuraLecturas([enDias]).texto).toBe('hace 3 d')
    vi.useRealTimers()
  })
})
