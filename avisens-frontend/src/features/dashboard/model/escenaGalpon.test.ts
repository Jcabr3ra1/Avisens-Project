import { describe, expect, it } from 'vitest'
import {
  antiguedadDeLectura, claseDeSensor, colorDeEdad, detalleDeKpi, escalaDelPollito, estadoDeLampara, faseDelDia,
  lecturaDeSensor, nombreDeSensor, posicionDelAstro, rangoConfigurado, senalDeSensor, sensorActivo, sensoresDeEscena, sombraDelGalpon,
  type SensorEscena,
} from './escenaGalpon'
import type { KpiGranja } from './resumenGranja'

type Crudo = Parameters<typeof sensoresDeEscena>[0][number]

const crudo = (resto: Pick<Crudo, 'tipo' | 'valor' | 'unidad' | 'estado'> & Partial<Crudo>): Crudo => ({
  id: 1, codigo: 'S-1', ultimaLecturaTs: null, minUmbral: null, maxUmbral: null, ...resto,
})

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

  it('el astro recorre solo la mitad derecha, lejos del texto de la franja', () => {
    for (let hora = 0; hora < 24; hora += 0.25) {
      const { x, y } = posicionDelAstro(hora)
      expect(x).toBeGreaterThanOrEqual(44)
      expect(x).toBeLessThanOrEqual(86)
      expect(y).toBeGreaterThanOrEqual(10)
      expect(y).toBeLessThanOrEqual(32)
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
      crudo({ tipo: 'luminosidad', valor: 300, unidad: 'lux', estado: 'optimo' }),
      crudo({ tipo: 'temperatura', valor: 29.4, unidad: '°C', estado: 'advertencia' }),
      crudo({ tipo: 'presion', valor: 1, unidad: 'hPa', estado: 'optimo' }),
    ])
    expect(lista.map((s) => s.clase)).toEqual(['temperatura', 'luz'])
    expect(lista[0]).toMatchObject({ nombre: 'Temperatura', valor: 29.4, unidad: '°C', estado: 'advertencia', etiquetaEstado: 'Advertencia' })
    expect(lista[0].explicacion).toMatch(/temperatura del aire/i)
  })

  it('no inventa una lectura cuando el sensor no reporta', () => {
    const [sensor] = sensoresDeEscena([crudo({ tipo: 'humedad', valor: 61, unidad: '%', estado: 'offline' })])
    expect(sensor.valor).toBeNull()
    expect(sensor.etiquetaEstado).toBe('Sin señal')
  })

  it('prefiere el sensor que sí tiene lectura cuando hay dos de la misma clase', () => {
    const [sensor] = sensoresDeEscena([
      crudo({ tipo: 'temperatura', valor: null, unidad: '°C', estado: 'lectura_no_disponible' }),
      crudo({ tipo: 'temperatura', valor: 28, unidad: '°C', estado: 'optimo' }),
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
    const base: SensorEscena = {
      id: 1, codigo: 'S-1', clase: 'temperatura', nombre: 'x', valor: 29.44, unidad: '°C', estado: 'optimo',
      etiquetaEstado: 'Óptimo', explicacion: '', ultimaLecturaTs: null, minUmbral: null, maxUmbral: null,
    }
    expect(lecturaDeSensor(base)).toBe('29,4 °C')
    expect(lecturaDeSensor({ ...base, clase: 'co2', valor: null, unidad: 'ppm' })).toBe('Sin lectura')
  })

  it('distingue los sensores que están enviando datos', () => {
    const [activo, caido] = sensoresDeEscena([
      crudo({ id: 1, tipo: 'temperatura', valor: 28, unidad: '°C', estado: 'optimo' }),
      crudo({ id: 2, tipo: 'humedad', valor: 60, unidad: '%', estado: 'offline' }),
    ])
    expect(sensorActivo(activo)).toBe(true)
    expect(sensorActivo(caido)).toBe(false)
  })

  it('conserva el código, la última lectura y los umbrales del sensor', () => {
    const [sensor] = sensoresDeEscena([
      crudo({ id: 7, codigo: 'T-07', tipo: 'temperatura', valor: 28, unidad: '°C', estado: 'optimo', ultimaLecturaTs: 1000, minUmbral: 24, maxUmbral: 32 }),
    ])
    expect(sensor).toMatchObject({ id: 7, codigo: 'T-07', ultimaLecturaTs: 1000, minUmbral: 24, maxUmbral: 32 })
  })

  it('cuenta hace cuánto llegó la última lectura', () => {
    const ahora = 10_000_000
    expect(antiguedadDeLectura(null, ahora)).toBe('Sin lecturas registradas')
    expect(antiguedadDeLectura(ahora - 20_000, ahora)).toBe('Hace unos segundos')
    expect(antiguedadDeLectura(ahora - 5 * 60_000, ahora)).toBe('Hace 5 min')
    expect(antiguedadDeLectura(ahora - 3 * 3600_000, ahora)).toBe('Hace 3 h')
    expect(antiguedadDeLectura(ahora - 49 * 3600_000, ahora)).toBe('Hace 2 d')
    expect(antiguedadDeLectura(ahora + 5000, ahora)).toBe('Hace unos segundos')
  })

  it('escribe el nombre de un sensor con mayúscula inicial', () => {
    expect(nombreDeSensor('co2')).toBe('CO₂')
    expect(nombreDeSensor('temperatura')).toBe('Temperatura')
    expect(nombreDeSensor('presión')).toBe('Presión')
  })

  it('traduce el estado del sensor a su señal', () => {
    expect(senalDeSensor('optimo')).toEqual({ texto: 'Transmitiendo', viva: true })
    expect(senalDeSensor('critico').viva).toBe(true)
    expect(senalDeSensor('obsoleta')).toEqual({ texto: 'Lecturas atrasadas', viva: false })
    expect(senalDeSensor('offline')).toEqual({ texto: 'Sin señal', viva: false })
  })

  it('escribe el rango configurado solo con los umbrales que existen', () => {
    const base: SensorEscena = {
      id: 1, codigo: 'S-1', clase: 'temperatura', nombre: 'x', valor: 28, unidad: '°C', estado: 'optimo',
      etiquetaEstado: 'Óptimo', explicacion: '', ultimaLecturaTs: null, minUmbral: null, maxUmbral: null,
    }
    expect(rangoConfigurado(base)).toBeNull()
    expect(rangoConfigurado({ ...base, minUmbral: 24, maxUmbral: 32 })).toBe('24 °C a 32 °C')
    expect(rangoConfigurado({ ...base, minUmbral: 24 })).toBe('Desde 24 °C')
    expect(rangoConfigurado({ ...base, maxUmbral: 32.5 })).toBe('Hasta 32,5 °C')
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
