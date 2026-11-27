import { describe, expect, it } from 'vitest'
import type { NivelCalor, RiesgoCalor } from '@features/predicciones/api/predicciones'
import { calorSencillo } from './calorSencillo'

function riesgo(nivel: NivelCalor, recomendaciones: string[] = []): RiesgoCalor {
  return {
    nivel_maximo: nivel,
    pico: { hora: '2026-11-24T14:00', temperatura: 34.6, humedad: 70, thi: 35, nivel },
    recomendaciones,
  } as RiesgoCalor
}

describe('calorSencillo', () => {
  it('sin riesgo lo dice con calma y sin consejo', () => {
    expect(calorSencillo(riesgo('confort', ['no importa']))).toEqual({
      tono: 'ok',
      titulo: 'Sin riesgo de estrés por calor',
      detalle: 'Próximas 72 h dentro del rango de confort.',
      consejo: null,
    })
  })

  it('atención y alerta son ámbar; peligro y emergencia son rojo', () => {
    expect(calorSencillo(riesgo('atencion')).tono).toBe('atencion')
    expect(calorSencillo(riesgo('alerta')).tono).toBe('atencion')
    expect(calorSencillo(riesgo('peligro')).tono).toBe('critico')
    expect(calorSencillo(riesgo('emergencia')).tono).toBe('critico')
  })

  it('dice el pico de temperatura y cuándo, sin hablar de índices', () => {
    const resultado = calorSencillo(riesgo('peligro', ['Abre las cortinas.']))
    expect(resultado.titulo).toBe('Riesgo de calor muy alto')
    expect(resultado.detalle).toMatch(/^Pico de 35 °C el .+\.$/)
    expect(resultado.detalle).not.toContain('THI')
    expect(resultado.consejo).toBe('Abre las cortinas.')
  })

  it('sin recomendaciones no inventa consejo', () => {
    expect(calorSencillo(riesgo('alerta')).consejo).toBeNull()
  })
})
