import { describe, expect, it } from 'vitest'
import {
  contarFiltrosActivos,
  extraerCambios,
  hayFiltros,
  periodoActivo,
  rangoDePeriodo,
  rangoValido,
  resumirNavegador,
} from './auditoria'

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

  it('cuenta los filtros activos agrupando el rango de fechas como un criterio', () => {
    expect(contarFiltrosActivos({})).toBe(0)
    expect(contarFiltrosActivos({ accion: 'crear', desde: '2026-10-01', hasta: '2026-10-10' })).toBe(2)
    expect(contarFiltrosActivos({ accion: 'crear', entidad: 'galpones', usuario_id: 5, desde: '2026-10-01' })).toBe(4)
  })

  it('calcula y reconoce los periodos rápidos', () => {
    const referencia = new Date(2026, 10, 21, 14, 30) // 21 nov 2026 local
    expect(rangoDePeriodo('todo', referencia)).toEqual({ desde: undefined, hasta: undefined })
    expect(rangoDePeriodo('hoy', referencia)).toEqual({ desde: '2026-11-21', hasta: '2026-11-21' })
    expect(rangoDePeriodo('7d', referencia)).toEqual({ desde: '2026-11-15', hasta: '2026-11-21' })
    expect(rangoDePeriodo('30d', referencia)).toEqual({ desde: '2026-10-23', hasta: '2026-11-21' })

    expect(periodoActivo({}, referencia)).toBe('todo')
    expect(periodoActivo({ desde: '2026-11-21', hasta: '2026-11-21' }, referencia)).toBe('hoy')
    expect(periodoActivo({ desde: '2026-11-15', hasta: '2026-11-21' }, referencia)).toBe('7d')
    expect(periodoActivo({ desde: '2026-11-01', hasta: '2026-11-10' }, referencia)).toBeNull()
  })

  it('extrae solo los campos modificados cuando hay antes y después', () => {
    const cambios = extraerCambios(
      { nombre: 'Galpón 1', capacidad: 5000, activo: true },
      { nombre: 'Galpón Norte', capacidad: 5000, activo: false, zona: 'A' },
    )
    expect(cambios).toEqual([
      { campo: 'nombre', antes: 'Galpón 1', despues: 'Galpón Norte', tipo: 'modificado' },
      { campo: 'activo', antes: 'Sí', despues: 'No', tipo: 'modificado' },
      { campo: 'zona', antes: null, despues: 'A', tipo: 'agregado' },
    ])
  })

  it('lista los campos registrados cuando solo hay estado resultante', () => {
    const cambios = extraerCambios(null, { codigo: 'G-01', activo: true, nota: null })
    expect(cambios).toEqual([
      { campo: 'codigo', antes: null, despues: 'G-01', tipo: 'valor' },
      { campo: 'activo', antes: null, despues: 'Sí', tipo: 'valor' },
      { campo: 'nota', antes: null, despues: '—', tipo: 'valor' },
    ])
  })

  it('resume el navegador de forma legible', () => {
    expect(resumirNavegador(null)).toBe('—')
    expect(
      resumirNavegador('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'),
    ).toBe('Chrome · macOS')
    expect(
      resumirNavegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'),
    ).toBe('Firefox · Windows')
  })
})
