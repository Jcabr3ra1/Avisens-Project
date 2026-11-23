import { describe, expect, it } from 'vitest'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { filaDeFaena, textoNoAlcanza, textoVenta, ventaDelLote } from './faena'

function curva(cambios: {
  objetivo?: number | null
  dia?: number | null
  fecha?: string | null
  confianza?: 'alta' | 'media' | 'baja'
  diaFinal?: number
}): CurvaCrecimiento {
  return {
    lote_id: 1,
    codigo: 'LOT-1',
    dia_actual: 20,
    dia_final: cambios.diaFinal ?? 42,
    peso_objetivo_g: cambios.objetivo === undefined ? 2500 : cambios.objetivo,
    referencias: { genetica: null, marca: null },
    serie: [],
    resumen: {
      ultimo_pesaje: { dia: 20, peso_g: 900 },
      desvio_vs_estandar_pct: 0,
      peso_final_g: 2600,
      dia_al_objetivo: cambios.dia === undefined ? 40 : cambios.dia,
      fecha_al_objetivo: cambios.fecha === undefined ? '2026-11-20' : cambios.fecha,
      punto_inflexion: { dia: 20, peso_g: 900, ganancia_max_g_dia: 80 },
    },
    modelo: { nombre: 'm', version: '1', confianza: 0.7, nivel_confianza: cambios.confianza ?? 'media', puntos_usados: 5 },
  }
}

describe('fila de la fecha de faena', () => {
  it('no inventa nada sin curva o sin peso objetivo', () => {
    expect(filaDeFaena(null)).toBeNull()
    expect(filaDeFaena(curva({ objetivo: null }))).toBeNull()
  })

  it('da la fecha en que se alcanza el objetivo y la confianza del cálculo', () => {
    const fila = filaDeFaena(curva({}))
    expect(fila?.etiqueta).toBe('Llegar a 2,50 kg')
    expect(fila?.valor).toBe('20/11/2026')
    expect(fila?.nota).toContain('Día 40 del ciclo')
    expect(fila?.nota).toContain('Confianza media')
    expect(fila?.alerta).toBeUndefined()
  })

  it('avisa cuando el lote no llega al objetivo dentro del ciclo', () => {
    const sinDia = filaDeFaena(curva({ dia: null, fecha: null }))
    expect(sinDia).toMatchObject({ valor: 'No alcanza', alerta: true })
    const tarde = filaDeFaena(curva({ dia: 47, diaFinal: 42 }))
    expect(tarde).toMatchObject({ valor: 'No alcanza', alerta: true })
  })
})

describe('ventaDelLote', () => {
  const ingreso = '2026-11-01'
  const hoy = new Date(2026, 10, 23, 9, 0)

  it('sin fecha de salida estimada no hay día de venta', () => {
    expect(ventaDelLote(ingreso, null, hoy)).toBeNull()
    expect(ventaDelLote(ingreso, undefined, hoy)).toBeNull()
    expect(ventaDelLote(ingreso, '', hoy)).toBeNull()
  })

  it('una fecha que no se puede leer se ignora', () => {
    expect(ventaDelLote(ingreso, 'pronto', hoy)).toBeNull()
  })

  it('cuenta los días que faltan con el día de ingreso como día 1', () => {
    const venta = ventaDelLote(ingreso, '2026-12-12', hoy)
    expect(venta).toMatchObject({ diaVenta: 42, diaActual: 23, faltan: 19 })
    expect(venta?.progreso).toBeCloseTo(23 / 42)
  })

  it('acepta la fecha como medianoche UTC que manda la API', () => {
    expect(ventaDelLote(ingreso, '2026-12-12T00:00:00.000Z', hoy)).toMatchObject({ diaVenta: 42, faltan: 19 })
  })

  it('pasado el día de venta el progreso no se sale de la barra', () => {
    const venta = ventaDelLote(ingreso, '2026-11-20', hoy)
    expect(venta).toMatchObject({ faltan: -3 })
    expect(venta?.progreso).toBe(1)
  })
})

describe('textoVenta', () => {
  const base = { diaVenta: 42, diaActual: 23, progreso: 0.5 }

  it('dice los días que faltan en singular y plural', () => {
    expect(textoVenta({ ...base, faltan: 19 })).toBe('Venta en 19 días')
    expect(textoVenta({ ...base, faltan: 1 })).toBe('Venta mañana')
  })

  it('el día de venta y los días ya pasados', () => {
    expect(textoVenta({ ...base, faltan: 0 })).toBe('Venta prevista para hoy')
    expect(textoVenta({ ...base, faltan: -1 })).toBe('Venta atrasada 1 día')
    expect(textoVenta({ ...base, faltan: -3 })).toBe('Venta atrasada 3 días')
  })
})

describe('textoNoAlcanza', () => {
  it('sin curva o sin peso objetivo no avisa nada', () => {
    expect(textoNoAlcanza(null)).toBeNull()
    expect(textoNoAlcanza(curva({ objetivo: null }))).toBeNull()
  })

  it('si el peso objetivo llega dentro del ciclo no avisa', () => {
    expect(textoNoAlcanza(curva({ dia: 40 }))).toBeNull()
  })

  it('avisa cuando no llega a tiempo o no hay día de llegada', () => {
    const esperado = 'Con la curva actual no alcanza 2,50 kg antes del día 42.'
    expect(textoNoAlcanza(curva({ dia: 45 }))).toBe(esperado)
    expect(textoNoAlcanza(curva({ dia: null, fecha: null }))).toBe(esperado)
  })
})
