import { describe, expect, it } from 'vitest'
import { notaTiposProveedor, resumirTiposProveedor } from './proveedor'

describe('resumirTiposProveedor', () => {
  it('cuenta los proveedores sin tipo en vez de ignorarlos', () => {
    expect(resumirTiposProveedor([{ tipo_proveedor: null }])).toEqual({ tipos: 0, sinClasificar: 1 })
    expect(resumirTiposProveedor([{ tipo_proveedor: '   ' }])).toEqual({ tipos: 0, sinClasificar: 1 })
  })

  it('no duplica un tipo por mayúsculas o espacios', () => {
    expect(resumirTiposProveedor([
      { tipo_proveedor: 'Alimento' },
      { tipo_proveedor: ' alimento ' },
      { tipo_proveedor: 'Pollitos' },
      { tipo_proveedor: null },
    ])).toEqual({ tipos: 2, sinClasificar: 1 })
  })
})

describe('notaTiposProveedor', () => {
  it('dice cuántos faltan por clasificar', () => {
    expect(notaTiposProveedor(0)).toBe('Clasificaciones distintas')
    expect(notaTiposProveedor(1)).toBe('1 sin clasificar')
    expect(notaTiposProveedor(3)).toBe('3 sin clasificar')
  })
})
