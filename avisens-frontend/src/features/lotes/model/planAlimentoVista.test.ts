import { describe, expect, it } from 'vitest'
import type { EstimacionAlimentoPlan, RenglonDesglose } from '../api/plan-alimento'
import {
  esEstimacionDelPlanVigente,
  etiquetaEstadoAlimento,
  etiquetaEstadoDesglose,
  etiquetaMotivo,
  etiquetaRenglon,
  explicacionEstadoAlimento,
  explicacionEstadoDesglose,
  tonoEstadoAlimento,
  tonoEstadoDesglose,
} from './planAlimentoVista'

function renglon(overrides: Partial<RenglonDesglose> = {}): RenglonDesglose {
  return {
    orden: 1,
    tipo_alimento_id: 9,
    tipo_alimento_nombre_snapshot: 'Preiniciador',
    etapa: 'preiniciacion',
    dia_inicio: 1,
    dia_fin: 8,
    extendido_hasta_dia_objetivo: false,
    consumo_por_ave_g: 80,
    consumo_total_kg: 0.8,
    ...overrides,
  }
}

function estimacionBase(overrides: Partial<EstimacionAlimentoPlan> = {}): EstimacionAlimentoPlan {
  return {
    id: 1,
    version: 1,
    vigente: true,
    estado_alimento: 'calculado',
    version_algoritmo: 'consumo_acumulado_lineal_muerte_fin_dia_v1',
    motivo: null,
    fecha_creacion: '2026-09-18T00:00:00.000Z',
    creado_por: { id: 1, nombre_completo: 'Admin' },
    plan: { id: 31, version: 1, dia_objetivo: 21, fecha_salida_calculada: null, curva: null },
    corte: { dia: 10, cantidad_inicial: 1000, muertes: 0, aves_vivas: 1000, mortalidad_por_dia: [] },
    resultado: { consumo_por_ave_g: 1190, consumo_total_kg: 1190 },
    desglose: { no_disponible: false, estado: 'calculado', version: 'v1', marca_alimento_snapshot: 'italcol', renglones: [] },
    efectiva: true,
    plan_vigente: { id: 31, version: 1, dia_objetivo: 21, desactualizado: false, es_el_mismo: true },
    desactualizado: false,
    motivos_desactualizacion: [],
    antiguedad_dias: 0,
    ...overrides,
  }
}

describe('tonoEstadoAlimento / etiquetaEstadoAlimento / explicacionEstadoAlimento', () => {
  it('calculado es ok y sin explicación', () => {
    expect(tonoEstadoAlimento('calculado')).toBe('ok')
    expect(explicacionEstadoAlimento('calculado')).toBe('')
  })

  it('los 4 estados de error tienen tono peligro o neutral y etiqueta no vacía', () => {
    const estados = [
      'plan_sin_dia_objetivo',
      'sin_consumo_en_curva',
      'consumo_insuficiente',
      'consumo_fuera_de_rango',
    ] as const
    for (const estado of estados) {
      expect(['peligro', 'neutral']).toContain(tonoEstadoAlimento(estado))
      expect(etiquetaEstadoAlimento(estado)).not.toBe('')
      expect(explicacionEstadoAlimento(estado)).not.toBe('')
    }
  })
})

describe('tonoEstadoDesglose / etiquetaEstadoDesglose / explicacionEstadoDesglose', () => {
  it('calculado es ok y sin explicación', () => {
    expect(tonoEstadoDesglose('calculado')).toBe('ok')
    expect(explicacionEstadoDesglose('calculado')).toBe('')
  })

  it('los 6 estados no calculados tienen etiqueta y explicación no vacías', () => {
    const estados = [
      'legado_sin_desglose',
      'lote_sin_marca_alimento',
      'marca_sin_catalogo',
      'catalogo_invalido',
      'catalogo_ambiguo',
      'catalogo_incompleto',
    ] as const
    for (const estado of estados) {
      expect(etiquetaEstadoDesglose(estado)).not.toBe('')
      expect(explicacionEstadoDesglose(estado)).not.toBe('')
    }
  })

  it('catalogo_invalido, catalogo_ambiguo y catalogo_incompleto son peligro', () => {
    expect(tonoEstadoDesglose('catalogo_invalido')).toBe('peligro')
    expect(tonoEstadoDesglose('catalogo_ambiguo')).toBe('peligro')
    expect(tonoEstadoDesglose('catalogo_incompleto')).toBe('peligro')
  })
})

describe('etiquetaRenglon', () => {
  it('un renglón real muestra el nombre del alimento', () => {
    expect(etiquetaRenglon(renglon())).toBe('Preiniciador')
  })

  it('un renglón sintético (hueco) se marca explícitamente', () => {
    const hueco = renglon({
      tipo_alimento_id: null,
      tipo_alimento_nombre_snapshot: null,
      etapa: null,
    })
    expect(etiquetaRenglon(hueco)).toContain('hueco')
  })
})

describe('etiquetaMotivo', () => {
  it('cubre los 8 motivos de desactualización', () => {
    const motivos = [
      'plan_cambio',
      'sin_plan_vigente',
      'cantidad_inicial_cambio',
      'algoritmo_cambio',
      'mortalidad_cambio',
      'mortalidad_actual_incoherente',
      'algoritmo_desglose_cambio',
      'marca_alimento_cambio',
    ] as const
    for (const motivo of motivos) {
      expect(etiquetaMotivo(motivo)).not.toBe('')
    }
  })
})

describe('esEstimacionDelPlanVigente', () => {
  it('es true cuando plan_vigente.es_el_mismo es true', () => {
    expect(esEstimacionDelPlanVigente(estimacionBase())).toBe(true)
  })

  it('es false cuando la estimación pertenece a una versión anterior del plan', () => {
    const historica = estimacionBase({
      plan_vigente: { id: 45, version: 2, dia_objetivo: 21, desactualizado: false, es_el_mismo: false },
    })
    expect(esEstimacionDelPlanVigente(historica)).toBe(false)
  })

  it('es false cuando el lote ya no tiene plan vigente', () => {
    expect(esEstimacionDelPlanVigente(estimacionBase({ plan_vigente: null }))).toBe(false)
  })
})
