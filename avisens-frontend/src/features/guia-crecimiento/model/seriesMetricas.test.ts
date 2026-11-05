import { describe, expect, it } from 'vitest'
import { serieAmbiente, serieConsumo, serieFcr, serieMortalidad } from './seriesMetricas'

const ingreso = '2026-10-01'
const mortalidad = [{ id: 1, lote_id: 4, fecha: '2026-10-03', cantidad_aves: 10, causa_presuntiva: null, disposicion: null, observaciones: null }]

describe('series de métricas de la guía', () => {
  it('compara consumo por ave con la curva del mismo día y descuenta muertes al día siguiente', () => {
    const puntos = serieConsumo(
      [{ id: 1, lote_id: 4, tipo_alimento_id: null, usuario_id: 1, fecha: '2026-10-03', alimento_kg: 20, agua_litros: null, alerta_agua_baja: false, metodo_registro: null, fecha_registro: '', lote: { id: 4, codigo: 'L-4' }, tipo_alimento: null }],
      mortalidad,
      ingreso,
      1000,
      4,
      [{ id: 1, dia: 3, peso_esperado_g: 100, consumo_diario_g: 20, consumo_acumulado_g: 50, fcr_objetivo: 1.2 }],
    )
    expect(puntos[2]).toEqual({ dia: 3, real: 20, esperado: 20 })
  })

  it('no fabrica consumo cuando la mortalidad es incoherente', () => {
    expect(serieConsumo([], [{ ...mortalidad[0], cantidad_aves: 1001 }], ingreso, 1000, 4, [])).toEqual([])
  })

  it('acumula mortalidad como porcentaje y omite días sin registros', () => {
    expect(serieMortalidad(mortalidad, ingreso, 1000, 4)).toEqual([{ dia: 3, real: 1, esperado: null }])
  })

  it('no grafica una mortalidad que supera las aves alojadas', () => {
    expect(serieMortalidad([{ ...mortalidad[0], cantidad_aves: 1001 }], ingreso, 1000, 4)).toEqual([])
  })

  it('usa solo indicadores calculados en la serie de FCR', () => {
    const puntos = serieFcr([
      { id: 1, lote_id: 4, fecha: '', dia_vida: 7, peso_promedio_g: 100, fcr: 1.4, consumo_acumulado_g: 30, estado_calculo: 'calculado', revision_calculo: 1, estado_peso: 'disponible', pesaje_fecha_snapshot: '' },
      { id: 2, lote_id: 4, fecha: '', dia_vida: 14, peso_promedio_g: 200, fcr: 9, consumo_acumulado_g: 40, estado_calculo: 'legado_sin_verificar', revision_calculo: 0, estado_peso: 'disponible', pesaje_fecha_snapshot: '' },
    ], [{ id: 1, dia: 7, peso_esperado_g: 100, consumo_diario_g: null, consumo_acumulado_g: null, fcr_objetivo: 1.3 }])
    expect(puntos).toEqual([{ dia: 7, real: 1.4, esperado: 1.3 }])
  })

  it('agrupa lecturas ambientales por hora y tipo de sensor', () => {
    const puntos = serieAmbiente([
      { id: '1', sensor_id: 2, fecha_hora: '2026-10-24T12:10:00Z', valor: 28, calidad: 'valida' },
      { id: '2', sensor_id: 3, fecha_hora: '2026-10-24T12:40:00Z', valor: 65, calidad: 'valida' },
      { id: '3', sensor_id: 2, fecha_hora: '2026-10-24T12:50:00Z', valor: 30, calidad: 'valida' },
    ], [{ sensor_id: 2, tipo: 'temperatura' }, { sensor_id: 3, tipo: 'humedad' }])
    expect(puntos).toHaveLength(1)
    expect(puntos[0].temperatura).toBe(29)
    expect(puntos[0].humedad).toBe(65)
  })
})
