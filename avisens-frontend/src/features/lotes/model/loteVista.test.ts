import { describe, expect, it } from 'vitest'
import { calcularResumenLotes, evaluarAltaDeLote } from './loteVista'
import type { Lote } from '../api/lotes'

describe('evaluarAltaDeLote', () => {
  it('permite crear cuando hay un galpón activo', () => {
    const resultado = evaluarAltaDeLote([{ activo: true }])
    expect(resultado).toEqual({ puedeCrear: true, motivoBloqueo: null })
  })

  it('bloquea y lo explica cuando el único galpón está inactivo', () => {
    const resultado = evaluarAltaDeLote([{ activo: false }])
    expect(resultado.puedeCrear).toBe(false)
    expect(resultado.motivoBloqueo).toContain('inactivo')
  })

  it('distingue "no hay galpón" de "el galpón está inactivo"', () => {
    const sinGalpon = evaluarAltaDeLote([])
    const galponInactivo = evaluarAltaDeLote([{ activo: false }])
    expect(sinGalpon.motivoBloqueo).not.toBe(galponInactivo.motivoBloqueo)
  })

  it('basta un galpón activo aunque haya otros inactivos', () => {
    const resultado = evaluarAltaDeLote([{ activo: false }, { activo: true }])
    expect(resultado.puedeCrear).toBe(true)
  })

  it('reporta la falta de galpón', () => {
    const resultado = evaluarAltaDeLote([])
    expect(resultado.motivoBloqueo).toContain('galpón')
  })

  it('bloquea cuando todos los galpones activos ya tienen un lote vigente', () => {
    const resultado = evaluarAltaDeLote(
      [{ id: 10, activo: true }],
      [{ estado: 'activo', galpon: { id: 10, nombre: 'G1', granja: { id: 1, nombre: 'F1', propietario_id: 2 } } }],
    )
    expect(resultado.puedeCrear).toBe(false)
    expect(resultado.motivoBloqueo).toContain('cerrar el lote vigente')
  })

  it('permite crear cuando al menos un galpón activo no tiene lote vigente', () => {
    const resultado = evaluarAltaDeLote(
      [{ id: 10, activo: true }, { id: 11, activo: true }],
      [{ estado: 'activo', galpon: { id: 10, nombre: 'G1', granja: { id: 1, nombre: 'F1', propietario_id: 2 } } }],
    )
    expect(resultado.puedeCrear).toBe(true)
  })
})

describe('calcularResumenLotes', () => {
  function lote(estado: string, cantidad: number): Lote {
    return { estado, cantidad_inicial: cantidad } as Lote
  }

  it('cuenta las aves de los lotes activos, no las de todos', () => {
    const resumen = calcularResumenLotes([
      lote('activo', 10_000),
      lote('activo', 5_000),
      lote('finalizado', 8_000),
    ])
    expect(resumen.avesAlojadas).toBe(15_000)
  })

  it('son las aves que ingresaron, no las que siguen vivas', () => {
    // La mortalidad vive en los indicadores del lote y aquí no se consulta,
    // por eso el nombre es "alojadas". Antes decía "activas" y la pantalla
    // afirmaba tener vivas las que se habían muerto.
    const resumen = calcularResumenLotes([lote('activo', 20_000)])
    expect(resumen.avesAlojadas).toBe(20_000)
  })

  it('separa los estados', () => {
    const resumen = calcularResumenLotes([
      lote('activo', 1), lote('finalizado', 1), lote('inactivo', 1),
    ])
    expect(resumen).toMatchObject({ total: 3, activos: 1, finalizados: 1, inactivos: 1 })
  })
})
