import { describe, expect, it } from 'vitest'
import type { Insumo } from '../api/insumos'
import {
  actualizarPayloadInsumo,
  crearFormularioInsumo,
  crearPayloadInsumo,
  formularioDesdeInsumo,
} from './formularioInsumo'

function formulario() {
  return {
    ...crearFormularioInsumo(7),
    nombre: '  Alimento iniciación  ',
    unidad_medida: 'kg',
    stock_actual: '100',
    stock_minimo: '20',
  }
}

describe('crearPayloadInsumo', () => {
  it('incluye la granja: el backend la exige y sin ella el alta da 400', () => {
    expect(crearPayloadInsumo(formulario()).granja_id).toBe(7)
  })

  it('recorta los espacios del nombre', () => {
    expect(crearPayloadInsumo(formulario()).nombre).toBe('Alimento iniciación')
  })

  it('los opcionales vacíos no se envían', () => {
    const payload = crearPayloadInsumo(formulario())
    expect(payload.tipo).toBeUndefined()
    expect(payload.precio_unitario_cop).toBeUndefined()
    expect(payload.fecha_vencimiento).toBeUndefined()
  })

  it('convierte a número lo que el formulario guarda como texto', () => {
    const payload = crearPayloadInsumo(formulario())
    expect(payload.stock_actual).toBe(100)
    expect(payload.stock_minimo).toBe(20)
  })
})

describe('actualizarPayloadInsumo', () => {
  it('no toca el stock: eso solo cambia con un movimiento, que deja rastro', () => {
    expect(actualizarPayloadInsumo(formulario()).stock_actual).toBeUndefined()
  })

  it('no traslada el insumo de granja al editar', () => {
    // Cambiar la granja movería el stock a otra bodega sin un movimiento
    // que lo explique.
    expect(actualizarPayloadInsumo(formulario()).granja_id).toBeUndefined()
  })
})

describe('formularioDesdeInsumo', () => {
  it('conserva la granja del insumo que se edita', () => {
    const insumo = { granja_id: 3, nombre: 'Viruta', unidad_medida: 'kg',
      stock_actual: 5, stock_minimo: 1, precio_unitario_cop: null, tipo: null,
      ubicacion_almacen: null, fecha_vencimiento: null } as Insumo
    expect(formularioDesdeInsumo(insumo).granja_id).toBe(3)
  })

  it('una fecha con hora se recorta al día para el input date', () => {
    const insumo = { granja_id: 1, nombre: 'X', unidad_medida: 'kg', stock_actual: 0,
      stock_minimo: 0, precio_unitario_cop: null, tipo: null, ubicacion_almacen: null,
      fecha_vencimiento: '2026-12-31T00:00:00.000Z' } as Insumo
    expect(formularioDesdeInsumo(insumo).fecha_vencimiento).toBe('2026-12-31')
  })
})
