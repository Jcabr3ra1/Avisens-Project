import { describe, expect, it } from 'vitest'
import { evaluarAltaDeLote } from './loteVista'

describe('evaluarAltaDeLote', () => {
  it('permite crear cuando hay galpón activo y proveedor', () => {
    const resultado = evaluarAltaDeLote([{ activo: true }], true)
    expect(resultado).toEqual({ puedeCrear: true, motivoBloqueo: null })
  })

  it('bloquea y lo explica cuando el único galpón está inactivo', () => {
    const resultado = evaluarAltaDeLote([{ activo: false }], true)
    expect(resultado.puedeCrear).toBe(false)
    expect(resultado.motivoBloqueo).toContain('inactivo')
  })

  it('distingue "no hay galpón" de "el galpón está inactivo"', () => {
    const sinGalpon = evaluarAltaDeLote([], true)
    const galponInactivo = evaluarAltaDeLote([{ activo: false }], true)
    expect(sinGalpon.motivoBloqueo).not.toBe(galponInactivo.motivoBloqueo)
  })

  it('basta un galpón activo aunque haya otros inactivos', () => {
    const resultado = evaluarAltaDeLote([{ activo: false }, { activo: true }], true)
    expect(resultado.puedeCrear).toBe(true)
  })

  it('bloquea por falta de proveedor aun con galpón activo', () => {
    const resultado = evaluarAltaDeLote([{ activo: true }], false)
    expect(resultado.puedeCrear).toBe(false)
    expect(resultado.motivoBloqueo).toContain('proveedores')
  })

  it('reporta primero la falta de galpón cuando faltan las dos cosas', () => {
    const resultado = evaluarAltaDeLote([], false)
    expect(resultado.motivoBloqueo).toContain('galpón')
  })
})
