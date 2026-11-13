import { describe, expect, it } from 'vitest'
import {
  errorDeConsumo,
  FORMULARIO_CONSUMO_INICIAL,
  ALIMENTO_MAXIMO_KG,
  AGUA_MAXIMO_LITROS,
  type FormularioConsumo,
} from './consumoDiario'

function formConsumo(datos: Partial<FormularioConsumo> = {}): FormularioConsumo {
  return {
    ...FORMULARIO_CONSUMO_INICIAL,
    lote_id: '1',
    tipo_alimento_id: '2',
    fecha: '2026-10-30',
    alimento_kg: '150',
    agua_litros: '300',
    ...datos,
  }
}

describe('errorDeConsumo', () => {
  it('acepta consumo válido', () => {
    expect(errorDeConsumo(formConsumo())).toBe('')
  })

  it('exige registrar al menos alimento o agua', () => {
    expect(errorDeConsumo(formConsumo({ alimento_kg: '', agua_litros: '' }))).toMatch(/al menos/)
  })

  it('exige tipo de alimento si se registra alimento', () => {
    expect(errorDeConsumo(formConsumo({ tipo_alimento_id: '', alimento_kg: '50', agua_litros: '' }))).toMatch(/tipo de alimento/)
  })

  it('rechaza cantidades astronómicas de alimento con margen amplio', () => {
    expect(errorDeConsumo(formConsumo({ alimento_kg: String(ALIMENTO_MAXIMO_KG + 1) }))).toMatch(/razonable/)
    expect(errorDeConsumo(formConsumo({ alimento_kg: '1.11111111111111e+40' }))).toMatch(/razonable/)
  })

  it('rechaza cantidades astronómicas de agua con margen amplio', () => {
    expect(errorDeConsumo(formConsumo({ agua_litros: String(AGUA_MAXIMO_LITROS + 1) }))).toMatch(/razonable/)
    expect(errorDeConsumo(formConsumo({ agua_litros: '1.11111111111111e+50' }))).toMatch(/razonable/)
  })
})
