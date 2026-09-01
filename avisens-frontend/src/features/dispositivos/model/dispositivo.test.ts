import { describe, expect, it } from 'vitest'
import { esMacValida } from './dispositivo'

describe('esMacValida', () => {
  it('acepta el formato con dos puntos', () => {
    expect(esMacValida('A4:CF:12:9B:00:1E')).toBe(true)
  })

  it('acepta minúsculas: los ESP32 la imprimen de las dos formas', () => {
    expect(esMacValida('a4:cf:12:9b:00:1e')).toBe(true)
  })

  it('ignora espacios alrededor', () => {
    expect(esMacValida('  A4:CF:12:9B:00:1E  ')).toBe(true)
  })

  it('rechaza guiones, longitudes malas y caracteres fuera de hexadecimal', () => {
    expect(esMacValida('A4-CF-12-9B-00-1E')).toBe(false)
    expect(esMacValida('A4:CF:12:9B:00')).toBe(false)
    expect(esMacValida('A4:CF:12:9B:00:1E:FF')).toBe(false)
    expect(esMacValida('ZZ:CF:12:9B:00:1E')).toBe(false)
    expect(esMacValida('')).toBe(false)
  })
})
