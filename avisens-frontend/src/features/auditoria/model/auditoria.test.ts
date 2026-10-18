import { describe, expect, it } from 'vitest'
import { hayFiltros, rangoValido } from './auditoria'

describe('filtros de auditoría', () => {
  it('detecta si hay algún filtro activo', () => {
    expect(hayFiltros({})).toBe(false)
    expect(hayFiltros({ accion: '', entidad: undefined })).toBe(false)
    expect(hayFiltros({ usuario_id: 3 })).toBe(true)
  })

  it('el rango es válido si falta un extremo o si «desde» no supera a «hasta»', () => {
    expect(rangoValido({})).toBe(true)
    expect(rangoValido({ desde: '2026-10-01' })).toBe(true)
    expect(rangoValido({ desde: '2026-10-01', hasta: '2026-10-01' })).toBe(true)
    expect(rangoValido({ desde: '2026-10-17', hasta: '2026-10-01' })).toBe(false)
  })
})
