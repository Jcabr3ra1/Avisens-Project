import { describe, expect, it } from 'vitest'
import {
  acumularCampo,
  calcularDelta,
  formatearFechaCorta,
  formatearFechaLarga,
  hayActividad,
  periodoValido,
  serieCrecimiento,
  sumarCampo,
  type PuntoSerieAdmin,
} from './metricas'

function punto(fecha: string, parcial: Partial<PuntoSerieAdmin> = {}): PuntoSerieAdmin {
  return { fecha, mediciones: 0, alertas: 0, aves_muertas: 0, usuarios_nuevos: 0, organizaciones_nuevas: 0, ...parcial }
}

describe('calcularDelta', () => {
  it('marca como bueno un aumento cuando subir es bueno', () => {
    const delta = calcularDelta(8, 5, 30, true)
    expect(delta).toMatchObject({ diferencia: 3, tono: 'bueno', direccion: 'sube', texto: '+3 vs. 30 días previos' })
  })

  it('marca como malo un aumento cuando subir es malo', () => {
    expect(calcularDelta(10, 4, 7, false).tono).toBe('malo')
  })

  it('marca como bueno una baja cuando bajar es bueno', () => {
    const delta = calcularDelta(2, 6, 90, false)
    expect(delta).toMatchObject({ tono: 'bueno', direccion: 'baja', texto: '−4 vs. 90 días previos' })
  })

  it('marca como malo una baja cuando subir es bueno', () => {
    expect(calcularDelta(1, 3, 30, true).tono).toBe('malo')
  })

  it('agrega la unidad al valor cuando se indica', () => {
    expect(calcularDelta(7, 5, 30, false, 'muertes').texto).toBe('+2 muertes vs. 30 días previos')
  })

  it('es neutro sin cambios', () => {
    expect(calcularDelta(4, 4, 30, true)).toMatchObject({ tono: 'neutro', direccion: 'igual', texto: 'Sin cambios vs. 30 días previos' })
  })

  it('formatea miles con separador colombiano', () => {
    expect(calcularDelta(2500, 0, 30, true).texto).toBe(`+${(2500).toLocaleString('es-CO')} vs. 30 días previos`)
  })
})

describe('series', () => {
  const series = [
    punto('2026-11-01', { usuarios_nuevos: 2, organizaciones_nuevas: 1, mediciones: 10 }),
    punto('2026-11-02'),
    punto('2026-11-03', { usuarios_nuevos: 1, mediciones: 5 }),
  ]

  it('suma un campo de la serie', () => {
    expect(sumarCampo(series, 'mediciones')).toBe(15)
  })

  it('acumula un campo conservando los días en cero', () => {
    expect(acumularCampo(series, 'usuarios_nuevos')).toEqual([2, 2, 3])
  })

  it('construye la serie de crecimiento acumulada', () => {
    expect(serieCrecimiento(series)).toEqual([
      { fecha: '2026-11-01', usuarios: 2, organizaciones: 1 },
      { fecha: '2026-11-02', usuarios: 2, organizaciones: 1 },
      { fecha: '2026-11-03', usuarios: 3, organizaciones: 1 },
    ])
  })

  it('detecta si hubo actividad en los campos indicados', () => {
    expect(hayActividad(series, ['mediciones'])).toBe(true)
    expect(hayActividad(series, ['aves_muertas'])).toBe(false)
    expect(hayActividad([], ['mediciones'])).toBe(false)
  })
})

describe('formato', () => {
  it('valida los periodos permitidos', () => {
    expect(periodoValido(7)).toBe(true)
    expect(periodoValido(30)).toBe(true)
    expect(periodoValido(15)).toBe(false)
  })

  it('formatea la fecha corta sin desfase de zona horaria', () => {
    expect(formatearFechaCorta('2026-11-01')).toMatch(/^1 nov/)
  })

  it('formatea la fecha larga en español', () => {
    const texto = formatearFechaLarga('2026-11-21')
    expect(texto).toContain('21')
    expect(texto).toContain('noviembre')
    expect(texto.toLowerCase()).toContain('sábado')
  })
})
