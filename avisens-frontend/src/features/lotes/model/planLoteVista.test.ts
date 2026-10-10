import { describe, expect, it } from 'vitest'
import type { PlanLote } from '../api/plan-lote'
import {
  DESCRIPCION_DESACTUALIZADO_PLAN,
  etiquetaEstadoPlan,
  explicacionEstadoPlan,
  tonoEstadoPlan,
} from './planLoteVista'

function planBase(overrides: Partial<PlanLote> = {}): PlanLote {
  return {
    id: 1,
    lote_id: 3,
    version: 1,
    vigente: true,
    peso_objetivo_g: 2500,
    estado_dia: 'calculado',
    motivo: null,
    fecha_creacion: '2026-09-18T00:00:00.000Z',
    creado_por: { id: 1, nombre_completo: 'Admin' },
    snapshot: {
      linea_genetica: { id: 1, codigo: 'ross_308', nombre: 'Ross 308' },
      sexo_curva: 'macho',
      fecha_ingreso: '2026-07-30T00:00:00.000Z',
    },
    curva: {
      version_id: 3,
      linea_genetica: { id: 1, codigo: 'ross_308', nombre: 'Ross 308' },
      sexo: 'macho',
      version: 1,
      fuente: 'test',
    },
    resultado: {
      dia_objetivo: 35,
      dia_objetivo_interpolado: 34.8,
      fecha_salida_calculada: '2026-09-02T00:00:00.000Z',
    },
    desactualizado: false,
    ...overrides,
  }
}

describe('tonoEstadoPlan', () => {
  it('calculado es ok', () => {
    expect(tonoEstadoPlan('calculado')).toBe('ok')
  })

  it('fuera_de_rango y datos_insuficientes son peligro', () => {
    expect(tonoEstadoPlan('fuera_de_rango')).toBe('peligro')
    expect(tonoEstadoPlan('datos_insuficientes')).toBe('peligro')
  })

  it('sin_curva es neutral', () => {
    expect(tonoEstadoPlan('sin_curva')).toBe('neutral')
  })
})

describe('etiquetaEstadoPlan', () => {
  it('tiene una etiqueta legible para los 4 estados', () => {
    for (const estado of ['calculado', 'sin_curva', 'fuera_de_rango', 'datos_insuficientes'] as const) {
      expect(etiquetaEstadoPlan(estado)).not.toBe('')
    }
  })
})

describe('explicacionEstadoPlan', () => {
  it('calculado no trae explicación', () => {
    expect(explicacionEstadoPlan(planBase({ estado_dia: 'calculado' }))).toBe('')
  })

  it('sin_curva sin línea genética señala que falta asignarla', () => {
    const plan = planBase({
      estado_dia: 'sin_curva',
      snapshot: { linea_genetica: null, sexo_curva: 'mixto', fecha_ingreso: '2026-07-30T00:00:00.000Z' },
    })
    expect(explicacionEstadoPlan(plan)).toContain('no tiene línea genética asignada')
  })

  it('sin_curva con línea genética señala la curva faltante, con nombre y sexo', () => {
    const plan = planBase({ estado_dia: 'sin_curva' })
    const explicacion = explicacionEstadoPlan(plan)
    expect(explicacion).toContain('Ross 308')
    expect(explicacion).toContain('macho')
  })

  it('fuera_de_rango explica que el peso excede la curva', () => {
    expect(explicacionEstadoPlan(planBase({ estado_dia: 'fuera_de_rango' }))).toContain('fuera del rango')
  })

  it('datos_insuficientes explica que la curva no alcanza para interpolar', () => {
    expect(explicacionEstadoPlan(planBase({ estado_dia: 'datos_insuficientes' }))).toContain('suficientes puntos')
  })
})

describe('DESCRIPCION_DESACTUALIZADO_PLAN', () => {
  it('menciona los cuatro factores que comparan el plan', () => {
    expect(DESCRIPCION_DESACTUALIZADO_PLAN).toContain('línea genética')
    expect(DESCRIPCION_DESACTUALIZADO_PLAN).toContain('sexo')
    expect(DESCRIPCION_DESACTUALIZADO_PLAN).toContain('ingreso')
    expect(DESCRIPCION_DESACTUALIZADO_PLAN).toContain('curva')
  })
})
