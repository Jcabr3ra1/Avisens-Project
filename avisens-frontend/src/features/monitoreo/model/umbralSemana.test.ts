import { describe, expect, it } from 'vitest'
import { umbralDeLaSemana } from './umbralSemana'

const u = (id: number, semana_vida: number, cambios: Partial<{ galpon_id: number; variable: string; vigente: boolean }> = {}) => ({
  id, galpon_id: 2, variable: 'temperatura', semana_vida, vigente: true, ...cambios,
})

describe('umbralDeLaSemana', () => {
  const umbrales = [u(1, 0), u(2, 3), u(3, 6), u(4, 6, { vigente: false }), u(5, 6, { variable: 'humedad' }), u(6, 6, { galpon_id: 9 })]

  it('usa el umbral de la semana exacta cuando existe', () => {
    expect(umbralDeLaSemana(umbrales, 2, 'temperatura', 3)?.id).toBe(2)
  })

  it('después de la semana 6 usa el último umbral configurado', () => {
    expect(umbralDeLaSemana(umbrales, 2, 'temperatura', 8)?.id).toBe(3)
  })

  it('si falta una semana intermedia, usa la anterior configurada', () => {
    expect(umbralDeLaSemana(umbrales, 2, 'temperatura', 2)?.id).toBe(1)
  })

  it('no usa umbrales de semanas posteriores, de otra variable, de otro galpón ni versiones no vigentes', () => {
    expect(umbralDeLaSemana([u(7, 4)], 2, 'temperatura', 2)).toBeUndefined()
    expect(umbralDeLaSemana(umbrales, 2, 'luminosidad', 8)).toBeUndefined()
    expect(umbralDeLaSemana(umbrales, 9, 'temperatura', 8)?.id).toBe(6)
    expect(umbralDeLaSemana([u(4, 6, { vigente: false })], 2, 'temperatura', 6)).toBeUndefined()
  })
})
