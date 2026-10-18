import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import type { HoraRiesgoCalor, NivelCalor, RiesgoCalor } from '../api/predicciones'
import {
  diasDelPronostico, escalaThi, esMedianoche, etiquetaHoraCorta, etiquetaHoraLarga, franjasCalor, horaPico, horasEnRiesgo,
  posicionEnEscala,
  interpretarErrorRiesgo, resumenAccesibleRiesgo, textoAjuste, titularRiesgo,
} from './riesgoCalor'

const hora = (h: string, thi: number, nivel: NivelCalor = 'confort'): HoraRiesgoCalor => ({
  hora: h, temperatura: thi + 1, humedad: 70, thi, nivel,
})

function riesgo(cambios: Partial<RiesgoCalor> = {}): RiesgoCalor {
  const serie = [hora('2026-10-18T12:00', 28), hora('2026-10-18T14:00', 34.8, 'alerta'), hora('2026-10-18T16:00', 31, 'atencion')]
  return {
    galpon_id: 31,
    galpon: 'G1',
    lote: { codigo: 'LOT-1', dia_vida: 30 },
    ubicacion: { latitud: 6.1, longitud: -75.3, origen: 'municipio' },
    interior: { temperatura: 32.5, humedad: 75 },
    serie,
    pico: serie[1],
    nivel_maximo: 'alerta',
    horas_por_nivel: { confort: 1, atencion: 1, alerta: 1, peligro: 0, emergencia: 0 },
    primera_alerta: '2026-10-18T14:00',
    ajuste_aplicado: { temperatura: 2.5, humedad: 15 },
    recomendaciones: ['Enciende ventiladores'],
    modelo: { nombre: 'estres_calor_thi', version: '1.0.0', tipo: 'thi', confianza: 0.8, puntos_usados: 3 },
    ...cambios,
  }
}

const error422 = (data: unknown) => new AxiosError('x', '422', undefined, undefined, {
  status: 422, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() },
})

describe('franjasCalor', () => {
  it('usa los umbrales de Tao y Xin para aves grandes', () => {
    expect(franjasCalor(30)).toEqual([
      { nivel: 'atencion', desde: 30, hasta: 34 },
      { nivel: 'alerta', desde: 34, hasta: 37 },
      { nivel: 'peligro', desde: 37, hasta: 38 },
      { nivel: 'emergencia', desde: 38, hasta: null },
    ])
  })

  it('sube tres puntos para pollitos menores de 14 dias, igual que el modelo', () => {
    expect(franjasCalor(13)[0]).toEqual({ nivel: 'atencion', desde: 33, hasta: 37 })
    expect(franjasCalor(14)[0].desde).toBe(30)
    expect(franjasCalor(null)[0].desde).toBe(30)
  })
})

describe('etiquetas de hora', () => {
  it('lee la hora local del pronostico sin correrla de zona', () => {
    expect(etiquetaHoraCorta('2026-10-18T14:00')).toBe('dom 2 p. m.')
    expect(etiquetaHoraLarga('2026-10-18T14:00')).toBe('domingo 18 a las 2 p. m.')
    expect(esMedianoche('2026-10-19T00:00')).toBe(true)
    expect(esMedianoche('2026-10-19T12:00')).toBe(false)
  })
})

describe('resumen del riesgo', () => {
  it('cuenta las horas con riesgo y anuncia desde cuando', () => {
    expect(horasEnRiesgo(riesgo())).toBe(2)
    expect(titularRiesgo(riesgo())).toBe('Alerta por calor desde el domingo 18 a las 2 p. m.')
  })

  it('sin riesgo lo dice claro', () => {
    const tranquilo = riesgo({
      nivel_maximo: 'confort',
      horas_por_nivel: { confort: 3, atencion: 0, alerta: 0, peligro: 0, emergencia: 0 },
    })
    expect(titularRiesgo(tranquilo)).toBe('Sin riesgo de calor en las próximas 72 horas')
    expect(horasEnRiesgo(tranquilo)).toBe(0)
  })

  it('explica el ajuste del interior o su ausencia', () => {
    expect(textoAjuste(riesgo())).toBe('Tu galpón está +2,5 °C frente al exterior')
    expect(textoAjuste(riesgo({ ajuste_aplicado: { temperatura: -1, humedad: 0 } }))).toBe('Tu galpón está −1 °C frente al exterior')
    expect(textoAjuste(riesgo({ interior: { temperatura: null, humedad: null } }))).toBe(
      'Sin lectura de tus sensores: se usa el clima exterior',
    )
  })

  it('arma una descripcion accesible del grafico', () => {
    expect(resumenAccesibleRiesgo(riesgo())).toContain('Pico de índice THI 34,8 el domingo 18 a las 2 p. m.')
    expect(resumenAccesibleRiesgo(riesgo())).toContain('2 de 3 horas con riesgo.')
  })

  it('encuentra la hora pico de la serie', () => {
    expect(horaPico(riesgo().serie)?.thi).toBe(34.8)
    expect(horaPico([])).toBeNull()
  })
})

describe('interpretarErrorRiesgo', () => {
  it('reconoce la granja sin ubicacion por su codigo', () => {
    const problema = interpretarErrorRiesgo(error422({ codigo: 'sin_ubicacion', message: 'Completa el municipio' }))
    expect(problema).toEqual({ tipo: 'sin_ubicacion', mensaje: 'Completa el municipio' })
  })

  it('cualquier otro fallo es un error con mensaje', () => {
    expect(interpretarErrorRiesgo(error422({ message: 'otro' })).tipo).toBe('error')
    expect(interpretarErrorRiesgo(new Error('x'))).toEqual({ tipo: 'error', mensaje: 'No se pudo calcular el riesgo de calor.' })
  })
})

describe('diasDelPronostico', () => {
  it('agrupa por dia, ubica cada hora en su casilla y omite dias casi vacios', () => {
    const serie = [
      hora('2026-10-17T23:00', 17),
      ...Array.from({ length: 24 }, (_, h) => hora(`2026-10-18T${String(h).padStart(2, '0')}:00`, 15 + (h === 13 ? 9 : 0))),
      ...Array.from({ length: 6 }, (_, h) => hora(`2026-10-19T0${h}:00`, 16)),
    ]

    const dias = diasDelPronostico(serie)

    expect(dias.map((dia) => dia.fecha)).toEqual(['2026-10-18', '2026-10-19'])
    expect(dias[0].etiqueta).toBe('domingo 18')
    expect(dias[0].horas).toHaveLength(24)
    expect(dias[0].pico.hora).toBe('2026-10-18T13:00')
    expect(dias[0].temperaturaMaxima).toBe(25)
    expect(dias[0].temperaturaMinima).toBe(16)
    expect(dias[1].horas[5]?.hora).toBe('2026-10-19T05:00')
    expect(dias[1].horas[6]).toBeNull()
  })
})

describe('escala del termometro', () => {
  it('cubre desde el fresco hasta pasada la emergencia y recorta los extremos', () => {
    const escala = escalaThi(franjasCalor(30))
    expect(escala).toEqual({ minimo: 10, maximo: 42 })
    expect(posicionEnEscala(26, escala)).toBe(50)
    expect(posicionEnEscala(5, escala)).toBe(0)
    expect(posicionEnEscala(50, escala)).toBe(100)
  })
})
