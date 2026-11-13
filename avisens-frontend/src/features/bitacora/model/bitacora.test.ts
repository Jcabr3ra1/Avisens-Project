import { describe, expect, it } from 'vitest'
import {
  errorDeRegistro,
  FORMULARIO_INICIAL,
  PESO_MAXIMO_G,
  PESO_MINIMO_G,
  AVES_MAXIMO,
  type FormularioRegistro,
} from './bitacora'

function formularioPeso(datos: Partial<FormularioRegistro> = {}): FormularioRegistro {
  return {
    ...FORMULARIO_INICIAL,
    fecha: '2026-10-30',
    peso_promedio_g: '2500',
    ...datos,
  }
}

describe('errorDeRegistro', () => {
  it('valida peso promedio dentro de rango razonable', () => {
    expect(errorDeRegistro('peso', formularioPeso())).toBe('')
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MAXIMO_G) }))).toBe('')
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MINIMO_G) }))).toBe('')
  })

  it('rechaza peso promedio negativo, cero o vacío', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '' }))).toMatch(/peso promedio/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '0' }))).toMatch(/al menos/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '-10' }))).toMatch(/al menos/)
  })

  it('rechaza valores astronómicos de peso promedio dejando margen sobre tablas', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MAXIMO_G + 1) }))).toMatch(/razonable/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '1000000000000' }))).toMatch(/razonable/)
  })

  it('rechaza peso objetivo fuera de rango razonable si se suministra', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_objetivo_g: '999999' }))).toMatch(/razonable/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_objetivo_g: '0' }))).toMatch(/al menos/)
  })

  it('rechaza cantidad desproporcionada de aves pesadas', () => {
    expect(errorDeRegistro('peso', formularioPeso({ cantidad_aves_pesadas: String(AVES_MAXIMO + 1) }))).toMatch(/no puede superar/)
  })

  it('valida fecha obligatoria', () => {
    expect(errorDeRegistro('peso', formularioPeso({ fecha: '' }))).toMatch(/fecha/)
  })
})
