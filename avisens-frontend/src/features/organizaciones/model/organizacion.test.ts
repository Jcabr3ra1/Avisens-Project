import { describe, expect, it } from 'vitest'
import type { Organizacion } from '../api/organizaciones'
import { etiquetaPlan, normalizarPlan, resumirOrganizaciones } from './organizacion'

function organizacion(cambios: Partial<Organizacion> = {}): Organizacion {
  return {
    id: 1, nombre: 'Cliente', nit: null, plan: 'free', activa: true,
    fecha_creacion: '2026-08-26T14:51:59.674Z',
    _count: { granjas: 1, usuarios: 3 },
    ...cambios,
  }
}

describe('resumirOrganizaciones', () => {
  it('suma los conteos que trae el servidor', () => {
    // Los totales salen del `_count` de cada fila y no de recorrer granjas y
    // usuarios: así no dependen de lo que alcance a ver quien mira.
    const resumen = resumirOrganizaciones([
      organizacion({ _count: { granjas: 1, usuarios: 3 } }),
      organizacion({ id: 2, _count: { granjas: 0, usuarios: 1 } }),
    ])
    expect(resumen).toEqual({ total: 2, activas: 2, granjas: 1, usuarios: 4 })
  })

  it('una organización suspendida cuenta en el total pero no en las activas', () => {
    const resumen = resumirOrganizaciones([
      organizacion(),
      organizacion({ id: 2, activa: false }),
    ])
    expect(resumen.total).toBe(2)
    expect(resumen.activas).toBe(1)
  })

  it('sin organizaciones todo queda en cero', () => {
    expect(resumirOrganizaciones([])).toEqual({ total: 0, activas: 0, granjas: 0, usuarios: 0 })
  })
})

describe('planes', () => {
  it('agrupa las variantes de escritura del mismo plan', () => {
    // El backend guarda `plan` como texto libre, así que 'Free', 'free ' y
    // 'FREE' llegan como cadenas distintas siendo el mismo plan.
    expect(normalizarPlan(' Free ')).toBe('free')
    expect(normalizarPlan('FREE')).toBe('free')
  })

  it('un plan vacío se dice con palabras, no con un hueco', () => {
    expect(etiquetaPlan('')).toBe('Sin plan')
    expect(etiquetaPlan('   ')).toBe('Sin plan')
  })
})
