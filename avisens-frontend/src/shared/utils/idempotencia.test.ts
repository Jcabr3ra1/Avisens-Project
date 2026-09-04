import { describe, expect, it } from 'vitest'
import { nuevaClaveIdempotencia } from './idempotencia'

describe('nuevaClaveIdempotencia', () => {
  it('cada intento nuevo recibe una clave distinta', () => {
    // Dos recepciones parciales por la misma cantidad son legítimas, así que
    // no puede derivarse solo del contenido: tienen que poder distinguirse.
    expect(nuevaClaveIdempotencia('recepcion')).not.toBe(nuevaClaveIdempotencia('recepcion'))
  })

  it('lleva el prefijo que identifica la operación', () => {
    expect(nuevaClaveIdempotencia('recepcion').startsWith('recepcion-')).toBe(true)
    expect(nuevaClaveIdempotencia('repuesto').startsWith('repuesto-')).toBe(true)
  })

  it('no depende del reloj para ser única', () => {
    // Con Date.now() como única fuente, dos llamadas en el mismo milisegundo
    // producían la misma clave. Y peor: cambiaba en cada reintento, que es
    // justo cuando debía mantenerse.
    const claves = new Set(Array.from({ length: 200 }, () => nuevaClaveIdempotencia('recepcion')))
    expect(claves.size).toBe(200)
  })
})
