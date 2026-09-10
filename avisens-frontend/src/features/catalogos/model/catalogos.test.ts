import { describe, expect, it } from 'vitest'
import { capitalizar, gramos, rangoDeDias } from './catalogos'

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
