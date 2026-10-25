import { describe, expect, it } from 'vitest'
import {
  claseDeSensor, colorDeEdad, detalleDeKpi, escalaDelPollito, estadoDeLampara, faseDelDia,
  lecturaDeSensor, posicionDelAstro, sensoresDeEscena, sombraDelGalpon,
} from './escenaGalpon'
import type { KpiGranja } from './resumenGranja'

const kpi = (id: KpiGranja['id'], valor: string): KpiGranja => ({
  id, valor, etiqueta: '', detalle: 'detalle', progreso: null, destino: '/granjas',
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

describe('edad del lote (usada también en la guía)', () => {
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

  it('la lámpara del techo refleja el tono de la granja', () => {
    expect(estadoDeLampara('ok')).toEqual({ color: 'ok', pulsa: false })
    expect(estadoDeLampara('atencion')).toEqual({ color: 'atencion', pulsa: true })
    expect(estadoDeLampara('critico')).toEqual({ color: 'critico', pulsa: true })
  })

  it('reconoce la clase de cada sensor por su tipo', () => {
    expect(claseDeSensor('temperatura')).toBe('temperatura')
    expect(claseDeSensor('Humedad relativa')).toBe('humedad')
    expect(claseDeSensor('co2')).toBe('co2')
    expect(claseDeSensor('Amoniaco (NH3)')).toBe('amoniaco')
    expect(claseDeSensor('luminosidad')).toBe('luz')
    expect(claseDeSensor('presion')).toBeNull()
  })

  it('dibuja solo los sensores que el galpón tiene, en un orden fijo', () => {
    const lista = sensoresDeEscena([
      { tipo: 'luminosidad', valor: 300, unidad: 'lux', conLectura: true },
      { tipo: 'temperatura', valor: 29.4, unidad: '°C', conLectura: true },
      { tipo: 'presion', valor: 1, unidad: 'hPa', conLectura: true },
    ])
    expect(lista.map((s) => s.clase)).toEqual(['temperatura', 'luz'])
    expect(lista[0]).toMatchObject({ nombre: 'Temperatura', valor: 29.4, unidad: '°C' })
  })

  it('no inventa una lectura cuando el sensor no reporta', () => {
    const [sensor] = sensoresDeEscena([{ tipo: 'humedad', valor: 61, unidad: '%', conLectura: false }])
    expect(sensor.valor).toBeNull()
  })

  it('prefiere el sensor que sí tiene lectura cuando hay dos de la misma clase', () => {
    const [sensor] = sensoresDeEscena([
      { tipo: 'temperatura', valor: null, unidad: '°C', conLectura: false },
      { tipo: 'temperatura', valor: 28, unidad: '°C', conLectura: true },
    ])
    expect(sensor.valor).toBe(28)
  })

  it('arma el detalle de cada indicador sin inventar datos', () => {
    expect(detalleDeKpi(kpi('aves', '500'), 9, null)).toBe('Día 9 del lote · detalle')
    expect(detalleDeKpi(kpi('aves', '500'), null, null)).toBe('detalle')
    expect(detalleDeKpi(kpi('sensores', '1/1'), null, '29,4 °C')).toBe('29,4 °C · detalle')
    expect(detalleDeKpi(kpi('sensores', '1/1'), null, null)).toBe('detalle')
    expect(detalleDeKpi(kpi('alertas', '0'), 9, '29,4 °C')).toBe('detalle')
  })

  it('escribe la lectura de un sensor o avisa que no reporta', () => {
    expect(lecturaDeSensor({ clase: 'temperatura', nombre: 'Temperatura', valor: 29.44, unidad: '°C' })).toBe('29,4 °C')
    expect(lecturaDeSensor({ clase: 'co2', nombre: 'CO₂', valor: null, unidad: 'ppm' })).toBe('sin lectura')
  })
})

describe('sombra del galpón', () => {
  it('cae hacia el lado opuesto del sol y se acorta al mediodía', () => {
    const mañana = sombraDelGalpon(posicionDelAstro(8))
    const mediodia = sombraDelGalpon(posicionDelAstro(12))
    const tarde = sombraDelGalpon(posicionDelAstro(16))
    expect(mañana.desplazamiento).toBeGreaterThan(0)
    expect(tarde.desplazamiento).toBeLessThan(0)
    expect(Math.abs(mediodia.desplazamiento)).toBeLessThan(Math.abs(mañana.desplazamiento))
    expect(mediodia.alargamiento).toBeLessThan(mañana.alargamiento)
  })

  it('de noche la sombra es suave y corta', () => {
    const noche = sombraDelGalpon(posicionDelAstro(23))
    expect(noche.alargamiento).toBeLessThan(1)
  })
})
