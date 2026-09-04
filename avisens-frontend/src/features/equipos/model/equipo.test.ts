import { describe, expect, it } from 'vitest'
import { numeroOpcional, porcentajeDesgaste } from './equipo'

describe('numeroOpcional', () => {
  it('distingue vacío de cero: en blanco es "no lo sé", no "vale 0"', () => {
    expect(numeroOpcional('')).toBeUndefined()
    expect(numeroOpcional('   ')).toBeUndefined()
    expect(numeroOpcional('0')).toBe(0)
  })

  it('descarta lo que no es número', () => {
    expect(numeroOpcional('abc')).toBeUndefined()
  })

  it('convierte enteros y decimales', () => {
    expect(numeroOpcional('1500')).toBe(1500)
    expect(numeroOpcional('3.5')).toBe(3.5)
  })
})

describe('porcentajeDesgaste', () => {
  it('no calcula nada sin vida útil declarada', () => {
    // Devolver 0 sería afirmar "está nuevo", que no es lo mismo que "no se sabe".
    expect(porcentajeDesgaste(500, null)).toBeNull()
    expect(porcentajeDesgaste(500, 0)).toBeNull()
  })

  it('trata las horas sin registrar como cero uso', () => {
    expect(porcentajeDesgaste(null, 1000)).toBe(0)
  })

  it('calcula el porcentaje y lo redondea', () => {
    expect(porcentajeDesgaste(500, 1000)).toBe(50)
    expect(porcentajeDesgaste(333, 1000)).toBe(33)
  })

  it('no pasa de 100 aunque el equipo haya superado su vida útil', () => {
    expect(porcentajeDesgaste(2500, 1000)).toBe(100)
  })
})
