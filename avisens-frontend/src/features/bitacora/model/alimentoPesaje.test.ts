import { describe, expect, it } from 'vitest'
import type { EstimacionAlimentoPlan } from '@features/lotes/api/plan-alimento'
import { resumirAlimentoParaPesaje, SIN_PLAN } from './alimentoPesaje'

function estimacion(datos: Partial<EstimacionAlimentoPlan> = {}): EstimacionAlimentoPlan {
  return {
    estado_alimento: 'calculado',
    plan: { id: 1, version: 1, dia_objetivo: 42, fecha_salida_calculada: null, curva: null },
    corte: { dia: 10, cantidad_inicial: 1000, muertes: 5, aves_vivas: 995, mortalidad_por_dia: [] },
    resultado: { consumo_por_ave_g: 4200, consumo_total_kg: 4179 },
    plan_vigente: { id: 1, version: 1, dia_objetivo: 42, desactualizado: false, es_el_mismo: true },
    desactualizado: false,
    motivos_desactualizacion: [],
    ...datos,
  } as EstimacionAlimentoPlan
}

describe('resumirAlimentoParaPesaje', () => {
  it('sin plan no inventa un número: queda pendiente de configuración', () => {
    expect(resumirAlimentoParaPesaje(null)).toEqual({ estado: 'pendiente', mensaje: SIN_PLAN })
  })

  it('presenta el resultado que calculó el backend', () => {
    expect(resumirAlimentoParaPesaje(estimacion())).toEqual({
      estado: 'calculado',
      totalKg: 4179,
      porAveG: 4200,
      diaObjetivo: 42,
      avesVivas: 995,
      avisos: [],
    })
  })

  it('una estimación de otra versión del plan no se presenta como vigente', () => {
    const vieja = estimacion({
      plan_vigente: { id: 2, version: 2, dia_objetivo: 40, desactualizado: false, es_el_mismo: false },
    })
    expect(resumirAlimentoParaPesaje(vieja).estado).toBe('pendiente')
    expect(resumirAlimentoParaPesaje(estimacion({ plan_vigente: null })).estado).toBe('pendiente')
  })

  it('si el backend no pudo calcular, explica el motivo', () => {
    const resumen = resumirAlimentoParaPesaje(estimacion({ estado_alimento: 'plan_sin_dia_objetivo' }))
    expect(resumen.estado).toBe('pendiente')
    if (resumen.estado === 'pendiente') expect(resumen.mensaje).toMatch(/día objetivo/)
  })

  it('calculado pero sin total también queda pendiente', () => {
    const sinTotal = estimacion({ resultado: { consumo_por_ave_g: null, consumo_total_kg: null } })
    expect(resumirAlimentoParaPesaje(sinTotal).estado).toBe('pendiente')
  })

  it('avisa los motivos cuando la estimación está desactualizada', () => {
    const resumen = resumirAlimentoParaPesaje(
      estimacion({ desactualizado: true, motivos_desactualizacion: ['mortalidad_cambio'] }),
    )
    expect(resumen.estado === 'calculado' && resumen.avisos).toEqual([
      'La mortalidad registrada cambió respecto al cálculo',
    ])
  })
})
