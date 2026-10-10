import { describe, expect, it } from 'vitest'
import { construirVista } from './useMonitoreoAmbiental'
import type { Galpon } from '@features/galpones/api/galpones'
import type { Sensor } from '@features/sensores/api/sensores'
import type { UltimaLecturaSensor } from '@features/sensores/api/mediciones'
import type { Umbral } from '@features/galpones/api/umbrales'

// Fixtures mínimas: solo lo que construirVista necesita para decidir el
// `estado` de un sensor. Sin sembrar nada en una base de datos — estas
// pruebas no dependen de que la cuenta tenga galpones ni sensores reales.

function galpon(parcial: Partial<Galpon> = {}): Galpon {
  return {
    id: 1,
    codigo: 'G1',
    nombre: 'Galpón 1',
    capacidad_aves: null,
    ancho_metros: null,
    largo_metros: null,
    orientacion: null,
    tipo_techo: null,
    plano_url: null,
    fecha_construccion: null,
    activo: true,
    granja: { id: 1, nombre: 'Granja A', propietario_id: 1 },
    ...parcial,
  }
}

function sensorApi(parcial: Partial<Sensor> = {}): Sensor {
  return {
    id: 1,
    codigo: 'TEMP-1',
    tipo: 'temperatura',
    unidad_medida: '°C',
    modelo: null,
    fabricante: null,
    coordenada_x: null,
    coordenada_y: null,
    altura_metros: null,
    fecha_instalacion: null,
    ultima_calibracion: null,
    proxima_calibracion: null,
    estado: 'activo',
    galpon: { id: 1, nombre: 'Galpón 1', granja: { id: 1, propietario_id: 1 } },
    dispositivo: { id: 1, nombre: 'Nodo 1', codigo_topic: 'g1' },
    ...parcial,
  }
}

function entrada(parcial: Partial<UltimaLecturaSensor> = {}): UltimaLecturaSensor {
  return {
    sensor_id: 1,
    galpon_id: 1,
    codigo: 'TEMP-1',
    tipo: 'temperatura',
    unidad_medida: '°C',
    estado_sensor: 'activo',
    ultima_lectura: null,
    ...parcial,
  }
}

function umbral(parcial: Partial<Umbral> = {}): Umbral {
  return {
    id: 1,
    galpon_id: 1,
    variable: 'temperatura',
    semana_vida: 0,
    valor_minimo: 20,
    valor_maximo: 30,
    unidad: '°C',
    criticidad: 'media',
    vigente: true,
    version: 1,
    fecha_creacion: new Date().toISOString(),
    galpon: { id: 1, nombre: 'Galpón 1', granja: { id: 1, propietario_id: 1 } },
    ...parcial,
  }
}

describe('construirVista · estado del sensor', () => {
  it('un sensor activo sin lectura queda "offline", no "lectura_no_disponible": la consulta funcionó, simplemente nunca reportó', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi()],
      [entrada({ ultima_lectura: null })],
      [],
      false,
    )
    expect(resultado[0].sensores[0].estado).toBe('offline')
  })

  it('si la consulta de últimas lecturas falló, un sensor activo queda "lectura_no_disponible" aunque su entrada traiga un valor real', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi()],
      [
        entrada({
          ultima_lectura: {
            valor: 24,
            fecha_hora: new Date().toISOString(),
            calidad: 'ok',
            antiguedad_segundos: 5,
          },
        }),
      ],
      [],
      true,
    )
    expect(resultado[0].sensores[0].estado).toBe('lectura_no_disponible')
  })

  it('un sensor inactivo sigue "offline" aunque la consulta de últimas lecturas haya fallado: es un hecho conocido, no una duda', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi({ estado: 'inactivo' })],
      [],
      [],
      true,
    )
    expect(resultado[0].sensores[0].estado).toBe('offline')
  })

  it('una lectura con más de 120s de antigüedad queda "obsoleta", aunque el valor esté dentro del umbral', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi()],
      [
        entrada({
          ultima_lectura: {
            valor: 24,
            fecha_hora: new Date().toISOString(),
            calidad: 'ok',
            antiguedad_segundos: 121,
          },
        }),
      ],
      [umbral()],
      false,
    )
    expect(resultado[0].sensores[0].estado).toBe('obsoleta')
  })

  it('justo en el umbral (120s) todavía no es obsoleta: se compara con ">", no con ">="', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi()],
      [
        entrada({
          ultima_lectura: {
            valor: 24,
            fecha_hora: new Date().toISOString(),
            calidad: 'ok',
            antiguedad_segundos: 120,
          },
        }),
      ],
      [umbral()],
      false,
    )
    expect(resultado[0].sensores[0].estado).toBe('optimo')
  })

  it('una lectura obsoleta no se confunde con "lectura_no_disponible": son causas distintas (dato viejo vs. consulta fallida)', () => {
    const resultado = construirVista(
      [galpon()],
      [],
      [sensorApi()],
      [
        entrada({
          ultima_lectura: {
            valor: 24,
            fecha_hora: new Date().toISOString(),
            calidad: 'ok',
            antiguedad_segundos: 999,
          },
        }),
      ],
      [],
      false,
    )
    expect(resultado[0].sensores[0].estado).toBe('obsoleta')
  })
})
