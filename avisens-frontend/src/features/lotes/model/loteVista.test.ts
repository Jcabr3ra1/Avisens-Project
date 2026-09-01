import { describe, expect, it } from 'vitest'
import { evaluarAltaDeLote } from './loteVista'

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
})
