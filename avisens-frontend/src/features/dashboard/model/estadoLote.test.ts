import { describe, expect, it } from 'vitest'
import {
  comparacionVigente,
  desvioPesoVigente,
  esDatoVerificado,
  lineaSparkline,
  pesoActualParaSparkline,
  serieDePesoVerificado,
  textoComparacion,
  textoComparacionFcr,
  textoFechaPesaje,
} from './estadoLote'
import type { DashboardIndicador } from './dashboard'

const indicador = (extra: Partial<DashboardIndicador> = {}): DashboardIndicador => ({
  fecha: '2026-09-20T00:00:00.000Z',
  diaVida: 21,
  pesoPromedioG: 1200,
  fcr: 1.2,
  epef: 300,
  mortalidadAcumuladaPct: 1,
  estadoCalculo: 'calculado',
  pesajeFechaSnapshot: '2026-09-20T00:00:00.000Z',
  ...extra,
})

describe('textoComparacion', () => {
  it('no dice nada cuando no hay curva con qué comparar', () => {
    expect(textoComparacion(null, 1400, 'g')).toBeUndefined()
    expect(textoComparacion(undefined, 1400, 'g')).toBeUndefined()
  })

  it('incluye la meta cuando el backend la manda', () => {
    expect(textoComparacion(3.2, 1376, 'g')).toBe('+3.2% sobre la curva · meta 1376 g')
    expect(textoComparacion(-4, 1376, 'g')).toBe('-4% bajo la curva · meta 1376 g')
    expect(textoComparacion(0, 1376, 'g')).toBe('en la curva · meta 1376 g')
  })

  it('omite la meta si no viene, sin dejar un "meta undefined"', () => {
    expect(textoComparacion(3.2, null, 'g')).toBe('+3.2% sobre la curva')
  })

  it('no agrega unidad cuando la métrica no tiene, como el FCR', () => {
    expect(textoComparacion(-2, 1.62, '')).toBe('-2% bajo la curva · meta 1.62')
  })
})

describe('textoComparacionFcr', () => {
  it('no agrega "%": el desvio de FCR es una diferencia absoluta, no un porcentaje', () => {
    expect(textoComparacionFcr(-0.15, 1.62)).toBe('-0.15 bajo la curva · meta 1.62')
    expect(textoComparacionFcr(0.08, 1.5)).toBe('+0.08 sobre la curva · meta 1.5')
  })

  it('no dice nada cuando no hay con qué comparar', () => {
    expect(textoComparacionFcr(null, 1.62)).toBeUndefined()
    expect(textoComparacionFcr(undefined, 1.62)).toBeUndefined()
  })

  it('omite la meta si no viene', () => {
    expect(textoComparacionFcr(-0.1, null)).toBe('-0.1 bajo la curva')
  })

  it('dice "en la curva" cuando el desvio es exactamente cero', () => {
    expect(textoComparacionFcr(0, 1.62)).toBe('en la curva · meta 1.62')
  })
})

describe('textoFechaPesaje', () => {
  it('sin fecha: no dice nada', () => {
    expect(textoFechaPesaje(null)).toBeUndefined()
    expect(textoFechaPesaje(undefined)).toBeUndefined()
  })

  it('formatea el dia (solo-fecha o con hora) anclado a mediodia local', () => {
    expect(textoFechaPesaje('2026-09-20')).toBe('al 20 de sept')
    expect(textoFechaPesaje('2026-09-20T00:00:00.000Z')).toBe('al 20 de sept')
  })
})

describe('comparacionVigente', () => {
  it('es vigente cuando la fecha del dato usado coincide con la del indicador mostrado', () => {
    expect(comparacionVigente('2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z')).toBe(true)
  })

  it('no es vigente cuando la comparacion viene de un dia distinto al que se muestra', () => {
    expect(comparacionVigente('2026-09-19T00:00:00.000Z', '2026-09-20T00:00:00.000Z')).toBe(false)
  })

  it('no es vigente si falta cualquiera de las dos fechas', () => {
    expect(comparacionVigente(null, '2026-09-20T00:00:00.000Z')).toBe(false)
    expect(comparacionVigente('2026-09-20T00:00:00.000Z', undefined)).toBe(false)
    expect(comparacionVigente(null, null)).toBe(false)
  })
})

describe('esDatoVerificado', () => {
  it('es verificado solo cuando el estado es calculado', () => {
    expect(esDatoVerificado('calculado')).toBe(true)
  })

  it('legado_sin_verificar no es dato verificado, aunque traiga numeros reales', () => {
    expect(esDatoVerificado('legado_sin_verificar')).toBe(false)
  })

  it('mortalidad_incoherente no es dato verificado', () => {
    expect(esDatoVerificado('mortalidad_incoherente')).toBe(false)
  })

  it('sin estado (fila ausente) no es dato verificado', () => {
    expect(esDatoVerificado(undefined)).toBe(false)
  })
})

describe('pesoActualParaSparkline', () => {
  it('no retrocede a un dato anterior valido cuando la ultima fila es legado_sin_verificar', () => {
    // La fila reciente trae un peso real (1200g), pero no verificado -- un
    // dato anterior valido (p. ej. 1100g de una fila 'calculado') no debe
    // aparecer en su lugar: la funcion ni siquiera recibe esa fila anterior.
    const reciente = indicador({ pesoPromedioG: 1200, estadoCalculo: 'legado_sin_verificar' })
    expect(pesoActualParaSparkline(reciente)).toBeNull()
  })

  it('no retrocede a un dato anterior valido cuando la ultima fila es mortalidad_incoherente', () => {
    const reciente = indicador({ pesoPromedioG: null, estadoCalculo: 'mortalidad_incoherente' })
    expect(pesoActualParaSparkline(reciente)).toBeNull()
  })

  it('muestra el peso cuando la ultima fila SI es un calculo verificado', () => {
    const reciente = indicador({ pesoPromedioG: 1200, estadoCalculo: 'calculado' })
    expect(pesoActualParaSparkline(reciente)).toBe(1200)
  })

  it('sin fila reciente (lote sin indicadores): null', () => {
    expect(pesoActualParaSparkline(null)).toBeNull()
  })
})

describe('desvioPesoVigente', () => {
  it('muestra el desvio cuando la ultima fila es calculada y la comparacion es del mismo dia', () => {
    expect(desvioPesoVigente(-3.2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'calculado')).toBe(-3.2)
  })

  it('no muestra el desvio cuando la comparacion viene de un dia distinto al mostrado', () => {
    expect(desvioPesoVigente(-3.2, '2026-09-19T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'calculado')).toBeNull()
  })

  it('misma fecha, pero la fila reciente no es un calculo verificado: no muestra el desvio', () => {
    // obtenerIndicadoresDeLote y compararConCurva son dos peticiones HTTP
    // independientes, sin lectura atomica compartida: que coincida la fecha
    // no garantiza que el estado que se tiene a mano de esa fila siga
    // siendo 'calculado' (p. ej. una recategorizacion entre ambas).
    expect(
      desvioPesoVigente(-3.2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'legado_sin_verificar'),
    ).toBeNull()
    expect(
      desvioPesoVigente(-3.2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'mortalidad_incoherente'),
    ).toBeNull()
    expect(
      desvioPesoVigente(-3.2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', undefined),
    ).toBeNull()
  })

  it('sin desvio numerico, aunque la comparacion sea vigente: null', () => {
    expect(desvioPesoVigente(null, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'calculado')).toBeNull()
    expect(desvioPesoVigente(undefined, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z', 'calculado')).toBeNull()
  })
})

describe('serieDePesoVerificado', () => {
  it('mezcla de puntos historicos: cuenta solo los verificados (calculado), descarta legado_sin_verificar aunque traiga peso real', () => {
    const indicadores = [
      indicador({ pesoPromedioG: 1000, estadoCalculo: 'calculado' }),
      indicador({ pesoPromedioG: 900, estadoCalculo: 'legado_sin_verificar' }),
      indicador({ pesoPromedioG: 800, estadoCalculo: 'calculado' }),
      indicador({ pesoPromedioG: null, estadoCalculo: 'mortalidad_incoherente' }),
    ]
    expect(serieDePesoVerificado(indicadores)).toEqual([1000, 800])
  })

  it('sin ningun punto verificado: serie vacia, no muestra ninguno sin verificar', () => {
    const indicadores = [
      indicador({ pesoPromedioG: 900, estadoCalculo: 'legado_sin_verificar' }),
      indicador({ pesoPromedioG: 850, estadoCalculo: 'legado_sin_verificar' }),
    ]
    expect(serieDePesoVerificado(indicadores)).toEqual([])
  })
})

describe('lineaSparkline', () => {
  it('no dibuja con menos de dos puntos', () => {
    expect(lineaSparkline([], 240, 44)).toBe('')
    expect(lineaSparkline([100], 240, 44)).toBe('')
  })

  it('reparte los puntos a lo ancho', () => {
    const puntos = lineaSparkline([0, 50, 100], 200, 40).split(' ')
    expect(puntos).toHaveLength(3)
    expect(puntos[0].startsWith('0.0,')).toBe(true)
    expect(puntos[2].startsWith('200.0,')).toBe(true)
  })

  it('invierte el eje: el valor más alto queda arriba', () => {
    const [primero, , ultimo] = lineaSparkline([0, 50, 100], 200, 40).split(' ')
    const y = (punto: string) => Number(punto.split(',')[1])
    expect(y(primero)).toBeGreaterThan(y(ultimo))
  })

  it('dibuja al medio cuando todos los valores son iguales', () => {
    // Sin este caso, un rango de cero divide por cero y la línea desaparece.
    const puntos = lineaSparkline([80, 80, 80], 200, 40).split(' ')
    expect(puntos.every((punto) => punto.endsWith(',20.0'))).toBe(true)
  })
})
