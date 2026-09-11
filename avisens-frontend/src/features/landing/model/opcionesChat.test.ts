import { describe, expect, it } from 'vitest'
import { seLeenEnPar } from './opcionesChat'

describe('seLeenEnPar', () => {
  it('un sí o no va de lado', () => {
    expect(seLeenEnPar(['Sí', 'No'])).toBe(true)
    expect(seLeenEnPar(['Sí, yo decido', 'No'])).toBe(true)
  })

  it('dos opciones largas se apilan', () => {
    // A media anchura se partirían en dos líneas y el área de toque quedaría
    // por debajo de lo cómodo en móvil, que es la razón de la columna única.
    expect(seLeenEnPar(['Mortalidad por calor o frío', 'Otra cosa'])).toBe(false)
  })

  it('tres o más siempre se apilan, aunque sean cortas', () => {
    expect(seLeenEnPar(['Sí', 'No', 'Tal vez'])).toBe(false)
  })

  it('una sola opción no forma pareja', () => {
    expect(seLeenEnPar(['Sí'])).toBe(false)
    expect(seLeenEnPar([])).toBe(false)
  })
})
