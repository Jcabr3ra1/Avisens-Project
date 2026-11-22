import { describe, expect, it } from 'vitest'
import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
import type { DashboardIndicador, DashboardLote } from './dashboard'
import { resumenLote } from './resumenLote'

const hoy = new Date(2026, 10, 23, 9, 0)

const lote: DashboardLote = {
  id: 10, galponId: 1, codigo: 'L-1', fechaIngreso: '2026-11-01', cantidadInicial: 1200, estado: 'activo',
  fechaSalidaEstimada: '2026-12-12',
}

function indicador(extra: Partial<DashboardIndicador> = {}): DashboardIndicador {
  return {
    fecha: '2026-11-23T00:00:00.000Z', diaVida: 23, pesoPromedioG: 1200, fcr: 1.6, epef: 300,
    mortalidadAcumuladaPct: 1, estadoCalculo: 'calculado', pesajeFechaSnapshot: '2026-11-22T00:00:00.000Z',
    revisionCalculo: 3, ...extra,
  }
}

function comparacion(extra: Partial<ComparacionIndicador> = {}): ComparacionIndicador {
  return {
    estado_actual: 'calculado', fecha_estado_actual: '2026-11-23T00:00:00.000Z',
    fecha_del_dato_usado: '2026-11-23T00:00:00.000Z', fecha_pesaje_usado: null, revision_calculo: 3,
    dia_vida: 23, veredicto: 'en_curva' as ComparacionIndicador['veredicto'], real: null,
    objetivo: { peso_esperado_g: 1250, fcr_objetivo: 1.5 }, desvio_peso_pct: -4, desvio_fcr: 0.1, ...extra,
  }
}

describe('resumenLote', () => {
  it('con datos verificados arma peso, mortalidad y conversión con cifra, meta y estado', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador()], comparacion: comparacion(), hoy })
    expect(resumen.hayDatos).toBe(true)
    expect(resumen.pollos).toEqual({ vivos: 1188, ingresados: 1200, muertos: 12 })
    const [peso, mortalidad, conversion] = resumen.medidas
    expect(peso).toEqual({
      clave: 'peso', titulo: 'Peso promedio', cifra: '1,20 kg', comparacion: 'meta 1,25 kg',
      juicio: { palabra: 'Bajo', tono: 'atencion' }, ayuda: null,
    })
    expect(mortalidad).toEqual({
      clave: 'mortalidad', titulo: 'Mortalidad', cifra: '1 %', comparacion: '12 aves',
      juicio: { palabra: 'Normal', tono: 'ok' }, ayuda: null,
    })
    expect(conversion).toMatchObject({
      clave: 'conversion', titulo: 'Conversión alimenticia', cifra: '1,60', comparacion: 'meta 1,50',
      juicio: { palabra: 'Alta', tono: 'atencion' },
    })
    expect(conversion.ayuda).toMatch(/^kg de alimento por kg ganado, al /)
  })

  it('sin muertes muestra 0 % y 0 aves, sin frases', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador({ mortalidadAcumuladaPct: 0 })], comparacion: comparacion(), hoy })
    expect(resumen.medidas[1]).toMatchObject({ cifra: '0 %', comparacion: '0 aves', juicio: { palabra: 'Normal' } })
  })

  it('trae el tiempo que falta para la venta', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador()], comparacion: comparacion(), hoy })
    expect(resumen.venta).toMatchObject({ diaVenta: 42, faltan: 19 })
  })

  it('sin indicadores calculados: no hay medidas, todos los pollos siguen vivos', () => {
    const resumen = resumenLote({ lote, indicadores: [], comparacion: null, hoy })
    expect(resumen.hayDatos).toBe(false)
    expect(resumen.medidas).toEqual([])
    expect(resumen.pollos).toEqual({ vivos: 1200, ingresados: 1200, muertos: 0 })
  })

  it('un cálculo sin verificar no se presenta como cifra válida', () => {
    const resumen = resumenLote({
      lote, indicadores: [indicador({ estadoCalculo: 'legado_sin_verificar' })], comparacion: comparacion(), hoy,
    })
    expect(resumen.hayDatos).toBe(false)
    expect(resumen.pollos.muertos).toBe(0)
  })

  it('un peso imposible se oculta en vez de mostrarse', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador({ pesoPromedioG: 1_000_000_000 })], comparacion: comparacion(), hoy })
    expect(resumen.medidas.map((m) => m.clave)).toEqual(['mortalidad', 'conversion'])
  })

  it('una conversión imposible se oculta', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador({ fcr: 2e24 })], comparacion: comparacion(), hoy })
    expect(resumen.medidas.map((m) => m.clave)).toEqual(['peso', 'mortalidad'])
  })

  it('la comparación de otro día no se usa: sin juicio ni meta', () => {
    const resumen = resumenLote({
      lote, indicadores: [indicador()], comparacion: comparacion({ fecha_del_dato_usado: '2026-11-20T00:00:00.000Z' }), hoy,
    })
    const [peso, , conversion] = resumen.medidas
    expect(peso.juicio).toBeNull()
    expect(peso.comparacion).toBeNull()
    expect(conversion.juicio).toBeNull()
    expect(conversion.comparacion).toBeNull()
  })

  it('una comparación de otra revisión del cálculo tampoco se usa', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador()], comparacion: comparacion({ revision_calculo: 2 }), hoy })
    expect(resumen.medidas[0].juicio).toBeNull()
  })

  it('sin comparación con la curva igual muestra las cifras', () => {
    const resumen = resumenLote({ lote, indicadores: [indicador()], comparacion: null, hoy })
    expect(resumen.medidas).toHaveLength(3)
    expect(resumen.medidas.every((m) => m.clave === 'mortalidad' || m.juicio === null)).toBe(true)
  })

  it('una sola ave muerta va en singular y la mortalidad alta se marca', () => {
    const uno = resumenLote({
      lote: { ...lote, cantidadInicial: 100 }, indicadores: [indicador({ mortalidadAcumuladaPct: 1 })], comparacion: null, hoy,
    })
    expect(uno.medidas[1].comparacion).toBe('1 ave')
    const alta = resumenLote({ lote, indicadores: [indicador({ mortalidadAcumuladaPct: 6.5 })], comparacion: null, hoy })
    expect(alta.medidas[1]).toMatchObject({ cifra: '6,5 %', comparacion: '78 aves', juicio: { palabra: 'Alta', tono: 'critico' } })
  })

  it('sin fecha de salida estimada no hay venta', () => {
    const resumen = resumenLote({ lote: { ...lote, fechaSalidaEstimada: null }, indicadores: [indicador()], comparacion: null, hoy })
    expect(resumen.venta).toBeNull()
  })
})
