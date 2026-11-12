import { describe, expect, it } from 'vitest'
import { validarConsumo, validarFechaRegistro, validarMortalidad } from './registroOperario'

describe('validarFechaRegistro', () => {
  it('acepta hoy y días anteriores, no fechas futuras', () => {
    expect(validarFechaRegistro('2026-11-11', '2026-11-11')).toBeNull()
    expect(validarFechaRegistro('2026-11-01', '2026-11-11')).toBeNull()
    expect(validarFechaRegistro('2026-11-12', '2026-11-11')).toMatch(/posterior a hoy/)
  })

  it('exige la fecha', () => {
    expect(validarFechaRegistro('', '2026-11-11')).toMatch(/fecha/)
  })
})

describe('validarMortalidad', () => {
  it('acepta un entero entre 1 y las aves del lote', () => {
    expect(validarMortalidad('1', 44)).toBeNull()
    expect(validarMortalidad(' 44 ', 44)).toBeNull()
  })

  it('rechaza vacío, cero, negativos, decimales y letras', () => {
    expect(validarMortalidad('', 44)).toMatch(/cuántas aves/)
    expect(validarMortalidad('0', 44)).toMatch(/al menos un ave/)
    expect(validarMortalidad('-3', 44)).toMatch(/enteros/)
    expect(validarMortalidad('2.5', 44)).toMatch(/enteros/)
    expect(validarMortalidad('dos', 44)).toMatch(/enteros/)
  })

  it('no deja registrar más aves de las que inició el lote', () => {
    expect(validarMortalidad('45', 44)).toMatch(/No puede superar las 44/)
  })
})

describe('validarConsumo', () => {
  it('pide al menos uno de los dos', () => {
    expect(validarConsumo('', '')).toMatch(/al menos el alimento o el agua/)
  })

  it('acepta decimales positivos en cualquiera de los dos', () => {
    expect(validarConsumo('12.5', '')).toBeNull()
    expect(validarConsumo('', '150')).toBeNull()
    expect(validarConsumo('3', '20.75')).toBeNull()
  })

  it('rechaza cero y negativos', () => {
    expect(validarConsumo('0', '')).toMatch(/alimento debe ser mayor que cero/)
    expect(validarConsumo('', '-5')).toMatch(/agua debe ser mayor que cero/)
  })
})
