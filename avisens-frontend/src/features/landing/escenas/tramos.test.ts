import { describe, expect, it } from 'vitest'
import { cuadroParaProgreso, type Tramo } from './tramos'

const tramos: Tramo[] = [[0, 0.3, 0, 50], [0.3, 0.62, 50, 100], [0.62, 0.85, 100, 150]]

describe('cuadroParaProgreso', () => {
  it('reparte cada tramo del scroll en su segmento de la animación', () => {
    expect(cuadroParaProgreso(0, tramos)).toBe(0)
    expect(cuadroParaProgreso(0.15, tramos)).toBe(25)
    expect(cuadroParaProgreso(0.3, tramos)).toBe(50)
    expect(cuadroParaProgreso(0.46, tramos)).toBe(75)
    expect(cuadroParaProgreso(0.85, tramos)).toBe(150)
  })

  it('se queda en el último cuadro después del final', () => {
    expect(cuadroParaProgreso(1, tramos)).toBe(150)
  })
})
