import { describe, expect, it } from 'vitest'
import type { CategoriaFinanciera } from '../api/movimientos-financieros'
import {
  categoriasParaTipo,
  errorDeFormulario,
  formularioVacio,
  payloadDesdeFormulario,
} from './movimiento'

function formulario(cambios: Partial<ReturnType<typeof formularioVacio>> = {}) {
  return {
    ...formularioVacio('2026-09-10'),
    categoria_id: '3',
    granja_id: '1',
    valor_cop: '150000',
    ...cambios,
  }
}

describe('payloadDesdeFormulario', () => {
  it('omite los opcionales vacíos en lugar de mandarlos en blanco', () => {
    // El backend los valida como número o cadena con formato: un '' se
    // rechaza con un 400 que desde la pantalla no se entiende.
    const payload = payloadDesdeFormulario(formulario())
    expect(payload).toEqual({
      categoria_id: 3,
      tipo: 'egreso',
      valor_cop: 150000,
      fecha: '2026-09-10',
      granja_id: 1,
    })
    expect('lote_id' in payload).toBe(false)
    expect('descripcion' in payload).toBe(false)
  })

  it('incluye los opcionales cuando sí traen valor', () => {
    const payload = payloadDesdeFormulario(formulario({
      lote_id: '7',
      descripcion: '  Compra de bulto  ',
      metodo_pago: 'efectivo',
    }))
    expect(payload.lote_id).toBe(7)
    expect(payload.descripcion).toBe('Compra de bulto')
    expect(payload.metodo_pago).toBe('efectivo')
  })

  it('convierte los números, que en el formulario viajan como texto', () => {
    const payload = payloadDesdeFormulario(formulario({ valor_cop: '99000' }))
    expect(payload.valor_cop).toBe(99000)
    expect(typeof payload.categoria_id).toBe('number')
  })
})

describe('errorDeFormulario', () => {
  it('un formulario completo no tiene problemas', () => {
    expect(errorDeFormulario(formulario())).toBe('')
  })

  it('rechaza un monto de cero o negativo', () => {
    expect(errorDeFormulario(formulario({ valor_cop: '0' }))).toMatch(/mayor que cero/)
    expect(errorDeFormulario(formulario({ valor_cop: '-500' }))).toMatch(/mayor que cero/)
  })

  it('exige categoría y granja', () => {
    expect(errorDeFormulario(formulario({ categoria_id: '' }))).toMatch(/categoría/)
    expect(errorDeFormulario(formulario({ granja_id: '' }))).toMatch(/granja/)
  })
})

describe('categoriasParaTipo', () => {
  const categorias: CategoriaFinanciera[] = [
    { id: 1, nombre: 'Venta de aves', tipo: 'ingreso' },
    { id: 2, nombre: 'Compra de alimento', tipo: 'egreso' },
    { id: 3, nombre: 'Sin clasificar', tipo: null },
  ]

  it('al registrar un egreso no ofrece las categorías de ingreso', () => {
    const visibles = categoriasParaTipo(categorias, 'egreso')
    expect(visibles.map((categoria) => categoria.id)).toEqual([2, 3])
  })

  it('las categorías sin tipo sirven para ambos', () => {
    expect(categoriasParaTipo(categorias, 'ingreso').map((c) => c.id)).toEqual([1, 3])
  })
})
