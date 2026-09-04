import { describe, expect, it } from 'vitest'
import type { Medicion } from '@features/sensores/api/mediciones'
import { alturaBarra, aSerie, etiquetaEstado, rangoUmbral, resumirSerie } from './metricas'

function medicion(fecha: string, valor: number): Medicion {
  return { id: fecha, sensor_id: 1, fecha_hora: fecha, valor, calidad: 'ok' }
}

describe('aSerie', () => {
  it('ordena de la lectura más antigua a la más reciente', () => {
    // El backend responde al revés; la gráfica se lee de izquierda a derecha.
    const serie = aSerie([
      medicion('2026-08-31T10:00:00.000Z', 30),
      medicion('2026-08-31T08:00:00.000Z', 22),
      medicion('2026-08-31T09:00:00.000Z', 26),
    ])
    expect(serie.map((punto) => punto.valor)).toEqual([22, 26, 30])
  })

  it('devuelve una serie vacía sin mediciones', () => {
    expect(aSerie([])).toEqual([])
  })
})

describe('resumirSerie', () => {
  it('deja los extremos en null cuando no hay datos', () => {
    expect(resumirSerie([])).toEqual({ minimo: null, promedio: null, maximo: null })
  })

  it('calcula mínimo, promedio y máximo', () => {
    const serie = [
      { hora: '08:00', valor: 22 },
      { hora: '09:00', valor: 26 },
      { hora: '10:00', valor: 30 },
    ]
    expect(resumirSerie(serie)).toEqual({ minimo: 22, promedio: 26, maximo: 30 })
  })

  it('redondea el promedio a un decimal', () => {
    const serie = [
      { hora: '08:00', valor: 1 },
      { hora: '09:00', valor: 2 },
      { hora: '10:00', valor: 2 },
    ]
    expect(resumirSerie(serie).promedio).toBe(1.7)
  })
})

describe('alturaBarra', () => {
  it('no divide por cero cuando no hay máximo', () => {
    expect(alturaBarra(20, null)).toBe(0)
    expect(alturaBarra(20, 0)).toBe(0)
  })

  it('escala contra el máximo de su propia serie', () => {
    expect(alturaBarra(30, 30)).toBe(100)
    expect(alturaBarra(15, 30)).toBe(50)
  })

  it('deja un mínimo visible para que un valor bajo no desaparezca', () => {
    expect(alturaBarra(0.1, 100)).toBe(4)
  })
})

describe('rangoUmbral', () => {
  it('dice cuando no hay umbral configurado', () => {
    expect(rangoUmbral(null, null, '°C')).toBe('Sin umbral configurado')
  })

  it('describe los umbrales abiertos por un solo lado', () => {
    expect(rangoUmbral(null, 29, '°C')).toBe('Máximo 29 °C')
    expect(rangoUmbral(25, null, '°C')).toBe('Mínimo 25 °C')
    expect(rangoUmbral(25, 29, '°C')).toBe('Umbral 25–29 °C')
  })
})

describe('etiquetaEstado', () => {
  it('traduce los estados del sensor', () => {
    expect(etiquetaEstado('optimo')).toBe('Óptimo')
    expect(etiquetaEstado('critico')).toBe('Crítico')
    expect(etiquetaEstado('offline')).toBe('Sin señal')
    expect(etiquetaEstado('sin_umbral')).toBe('Sin umbral')
  })
})
