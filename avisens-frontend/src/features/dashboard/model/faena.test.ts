import { describe, expect, it } from 'vitest'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { filaDeFaena } from './faena'

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
