import { describe, expect, it } from 'vitest'
import { crearCsv } from './reportes'

describe('crearCsv', () => {
  it('conserva tildes, comillas y saltos de línea en formato CSV', () => {
    expect(crearCsv(['Lote', 'Observación'], [['L-1', 'Dijo "alto",\nrevisar']])).toBe(
      '\uFEFF"Lote","Observación"\r\n"L-1","Dijo ""alto"",\nrevisar"',
    )
  })

  it('neutraliza fórmulas en texto y conserva números negativos', () => {
    expect(crearCsv(['Nombre', 'Desvío'], [['=SUMA(A1:A2)', -2.5]])).toBe(
      '\uFEFF"Nombre","Desvío"\r\n"\'=SUMA(A1:A2)","-2.5"',
    )
  })
})
