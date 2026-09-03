import { describe, expect, it } from 'vitest'
import { lineaSparkline, textoComparacion } from './estadoLote'

describe('textoComparacion', () => {
  it('no dice nada cuando no hay curva con qué comparar', () => {
    expect(textoComparacion(null, 1400, 'g')).toBeUndefined()
    expect(textoComparacion(undefined, 1400, 'g')).toBeUndefined()
  })

  it('incluye la meta cuando el backend la manda', () => {
    expect(textoComparacion(3.2, 1376, 'g')).toBe('+3.2% sobre la curva · meta 1376 g')
    expect(textoComparacion(-4, 1376, 'g')).toBe('-4% bajo la curva · meta 1376 g')
    expect(textoComparacion(0, 1376, 'g')).toBe('en la curva · meta 1376 g')
  })

  it('omite la meta si no viene, sin dejar un "meta undefined"', () => {
    expect(textoComparacion(3.2, null, 'g')).toBe('+3.2% sobre la curva')
  })

  it('no agrega unidad cuando la métrica no tiene, como el FCR', () => {
    expect(textoComparacion(-2, 1.62, '')).toBe('-2% bajo la curva · meta 1.62')
  })
})

describe('lineaSparkline', () => {
  it('no dibuja con menos de dos puntos', () => {
    expect(lineaSparkline([], 240, 44)).toBe('')
    expect(lineaSparkline([100], 240, 44)).toBe('')
  })

  it('reparte los puntos a lo ancho', () => {
    const puntos = lineaSparkline([0, 50, 100], 200, 40).split(' ')
    expect(puntos).toHaveLength(3)
    expect(puntos[0].startsWith('0.0,')).toBe(true)
    expect(puntos[2].startsWith('200.0,')).toBe(true)
  })

  it('invierte el eje: el valor más alto queda arriba', () => {
    const [primero, , ultimo] = lineaSparkline([0, 50, 100], 200, 40).split(' ')
    const y = (punto: string) => Number(punto.split(',')[1])
    expect(y(primero)).toBeGreaterThan(y(ultimo))
  })

  it('dibuja al medio cuando todos los valores son iguales', () => {
    // Sin este caso, un rango de cero divide por cero y la línea desaparece.
    const puntos = lineaSparkline([80, 80, 80], 200, 40).split(' ')
    expect(puntos.every((punto) => punto.endsWith(',20.0'))).toBe(true)
  })
})
