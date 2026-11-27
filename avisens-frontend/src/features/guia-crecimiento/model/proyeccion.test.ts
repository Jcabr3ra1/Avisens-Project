import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import {
  estandarDelDia, explicarSinProyeccion, formatearPeso, gramos, interpretarErrorCurva, porcentaje,
  resumenAccesible, textoDesvio, tonoDesvio,
} from './proyeccion'

function errorHttp(status: number, message: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(message, String(status), config, null, {
    status, statusText: '', headers: {}, config, data: { message },
  })
}

const curva: CurvaCrecimiento = {
  lote_id: 11,
  codigo: 'DEMO',
  dia_actual: 22,
  dia_final: 42,
  peso_objetivo_g: null,
  referencias: { genetica: { linea: 'Ross 308', sexo: 'mixto', version: 1, fuente: 'x' }, marca: null },
  serie: [
    { dia: 21, real_g: 960, proyectado_g: 975, min_g: 889, max_g: 1061, estandar_g: 1012, marca_g: null },
    { dia: 22, real_g: null, proyectado_g: 1050, min_g: 960, max_g: 1140, estandar_g: null, marca_g: null },
  ],
  resumen: {
    ultimo_pesaje: { dia: 21, peso_g: 960 },
    desvio_vs_estandar_pct: -5.1,
    peso_final_g: 2896,
    dia_al_objetivo: null,
    fecha_al_objetivo: null,
    punto_inflexion: { dia: 33.3, peso_g: 2083, ganancia_max_g_dia: 95.7 },
  },
  modelo: { nombre: 'crecimiento_gompertz', version: '2.0.0', confianza: 0.8749, puntos_usados: 3 },
}

describe('proyeccion', () => {
  it('formatea gramos y porcentajes en español de Colombia', () => {
    expect(gramos(2896)).toBe('2.896 g')
    expect(gramos(null)).toBe('—')
    expect(gramos(Number.NaN)).toBe('—')
    expect(porcentaje(0.8749)).toBe('87 %')
  })

  it('formatea pesos de forma inteligente (< 1.000 g en g, >= 1.000 g en kg)', () => {
    expect(formatearPeso(45)).toBe('45 g')
    expect(formatearPeso(450)).toBe('450 g')
    expect(formatearPeso(990)).toBe('990 g')
    expect(formatearPeso(1000)).toBe('1,00 kg')
    expect(formatearPeso(1850)).toBe('1,85 kg')
    expect(formatearPeso(2500)).toBe('2,50 kg')
    expect(formatearPeso(2896)).toBe('2,90 kg')
    expect(formatearPeso(null)).toBe('—')
    expect(formatearPeso(undefined)).toBe('—')
    expect(formatearPeso(Number.NaN)).toBe('—')
  })

  it('clasifica el desvío con un margen de ±3 % como "en la curva"', () => {
    expect(tonoDesvio(-5.1)).toBe('bajo')
    expect(tonoDesvio(-3)).toBe('en-curva')
    expect(tonoDesvio(2.4)).toBe('en-curva')
    expect(tonoDesvio(3.1)).toBe('alto')
  })

  it('describe el desvío con palabras, no solo con color', () => {
    expect(textoDesvio(-5.1, 'Ross 308')).toBe('5,1 % por debajo de Ross 308')
    expect(textoDesvio(4, 'Cobb 500')).toBe('4,0 % por encima de Cobb 500')
    expect(textoDesvio(-1.2, 'Ross 308')).toBe('En la curva de Ross 308 (−1,2 %)')
  })

  it('busca el peso estándar de un día de la serie', () => {
    expect(estandarDelDia(curva, 21)).toBe(1012)
    expect(estandarDelDia(curva, 22)).toBeNull()
    expect(estandarDelDia(curva, 90)).toBeNull()
  })

  it('distingue un lote sin pesajes de un error real', () => {
    expect(interpretarErrorCurva(errorHttp(422, 'El lote necesita al menos un pesaje para proyectar su curva'))).toEqual({ tipo: 'sin_pesajes' })
    expect(interpretarErrorCurva(errorHttp(422, 'El pesaje del día 2 de vida marca 21.000 g por ave, que no es posible.'))).toEqual({
      tipo: 'error', mensaje: 'El pesaje del día 2 de vida marca 21.000 g por ave, que no es posible.',
    })
    expect(interpretarErrorCurva(errorHttp(400, 'El servicio de predicción no respondió'))).toEqual({
      tipo: 'error', mensaje: 'El servicio de predicción no respondió',
    })
  })

  it('resume la curva en una frase para lectores de pantalla', () => {
    expect(resumenAccesible(curva, 'Ross 308')).toBe(
      'Curva de crecimiento del lote DEMO. Último pesaje: 960 g el día 21. Proyección al día 42: 2.896 g. 5,1 % por debajo de Ross 308.',
    )
  })

  it('traduce por qué no hay proyección al cierre en una instrucción', () => {
    expect(explicarSinProyeccion('El lote no tiene un plan con día objetivo calculado')).toMatch(/peso objetivo/)
    expect(explicarSinProyeccion('Se necesitan pesajes de al menos 3 días distintos para predecir')).toMatch(/3 días/)
    expect(explicarSinProyeccion('El lote ya superó el día de proyección')).toMatch(/pasó su día de salida/)
    expect(explicarSinProyeccion('El servicio de predicción devolvió una respuesta inválida')).toMatch(/No fue posible estimar el cierre/)
    expect(explicarSinProyeccion('Otro motivo')).toBe('Otro motivo')
  })
})
