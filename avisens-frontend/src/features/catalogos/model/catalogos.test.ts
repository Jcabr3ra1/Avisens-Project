import { describe, expect, it } from 'vitest'
import {
  capitalizar,
  etiquetaEtapa,
  filtrarAlimentos,
  filtrarSensores,
  gramos,
  rangoDeDias,
} from './catalogos'

describe('rangoDeDias', () => {
  it('describe el rango completo', () => {
    expect(rangoDeDias(1, 8)).toBe('Día 1 a 8')
  })

  it('aguanta que falte cualquiera de los dos extremos', () => {
    // Los dos son opcionales en el backend. Un guion suelto («1 – ») se lee
    // como un error de la pantalla, no como un dato incompleto.
    expect(rangoDeDias(22, null)).toBe('Desde el día 22')
    expect(rangoDeDias(null, 8)).toBe('Hasta el día 8')
    expect(rangoDeDias(null, null)).toBe('Sin definir')
  })

  it('el día cero es un dato, no un hueco', () => {
    expect(rangoDeDias(0, 8)).toBe('Día 0 a 8')
  })
})

describe('gramos', () => {
  it('separa los miles y pone la unidad', () => {
    expect(gramos(2800)).toBe('2.800 g')
  })

  it('distingue el cero del dato ausente', () => {
    expect(gramos(0)).toBe('0 g')
    expect(gramos(null)).toBe('—')
  })
})

describe('capitalizar', () => {
  it('no revienta con la cadena vacía', () => {
    expect(capitalizar('')).toBe('')
  })

  it('deja el resto como está', () => {
    expect(capitalizar('preiniciacion')).toBe('Preiniciacion')
  })
})

describe('etiquetaEtapa', () => {
  it('muestra las etapas con tilde y respeta las desconocidas', () => {
    expect(etiquetaEtapa('preiniciacion')).toBe('Preiniciación')
    expect(etiquetaEtapa('Iniciacion')).toBe('Iniciación')
    expect(etiquetaEtapa('retiro')).toBe('Retiro')
  })
})

describe('filtrarAlimentos y filtrarSensores', () => {
  const alimentos = [
    { id: 1, nombre: 'Preiniciación Plus', marca: 'italcol', etapa: 'preiniciacion', presentacion: 'migaja', dia_inicio: 1, dia_fin: 10, consumo_total_esperado_g: 280, activo: true },
    { id: 2, nombre: 'Engorde Final', marca: 'solla', etapa: 'engorde', presentacion: 'peletizado', dia_inicio: 22, dia_fin: 42, consumo_total_esperado_g: 2600, activo: false },
  ]
  const sensores = [
    { id: 1, tipo_sensor: 'dht22_temp', nombre: 'Temperatura ambiental', descripcion: 'Sensor DHT22', precio_unitario_cop: 45000, cobertura_m2: 100, obligatorio: true, activo: true },
    { id: 2, tipo_sensor: 'mq135_nh3', nombre: 'Amoníaco', descripcion: 'Gas NH3', precio_unitario_cop: 80000, cobertura_m2: 150, obligatorio: false, activo: false },
  ]

  it('filtra alimentos por disponibilidad y búsqueda sin tildes', () => {
    expect(filtrarAlimentos(alimentos, { busqueda: 'preiniciacion', estado: 'todos' }).map((a) => a.id)).toEqual([1])
    expect(filtrarAlimentos(alimentos, { busqueda: '', estado: 'retirados' }).map((a) => a.id)).toEqual([2])
    expect(filtrarAlimentos(alimentos, { busqueda: 'solla', estado: 'disponibles' })).toEqual([])
  })

  it('filtra sensores por disponibilidad y búsqueda en código o nombre sin tildes', () => {
    expect(filtrarSensores(sensores, { busqueda: 'amoniaco', estado: 'todos' }).map((s) => s.id)).toEqual([2])
    expect(filtrarSensores(sensores, { busqueda: 'dht22', estado: 'disponibles' }).map((s) => s.id)).toEqual([1])
    expect(filtrarSensores(sensores, { busqueda: '', estado: 'retirados' }).map((s) => s.id)).toEqual([2])
  })
})
