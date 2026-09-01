import { describe, expect, it } from 'vitest'
import type { Insumo } from '../api/insumos'
import {
  estadoStock,
  filtrarInsumos,
  ordenarPorUrgencia,
  porcentajeDeStock,
  resumirInventario,
  signoDeMovimiento,
} from './inventario'

function insumo(parcial: Partial<Insumo>): Insumo {
  return {
    id: 1,
    granja_id: 1,
    nombre: 'Alimento iniciación',
    tipo: 'alimento',
    unidad_medida: 'kg',
    stock_actual: 100,
    stock_minimo: 50,
    precio_unitario_cop: 2000,
    proveedor_habitual_id: null,
    ubicacion_almacen: null,
    fecha_vencimiento: null,
    activo: true,
    ...parcial,
  }
}

describe('estadoStock', () => {
  it('por encima del mínimo está OK', () => {
    expect(estadoStock(insumo({ stock_actual: 100, stock_minimo: 50 }))).toBe('ok')
  })

  it('justo en el mínimo todavía está OK', () => {
    expect(estadoStock(insumo({ stock_actual: 50, stock_minimo: 50 }))).toBe('ok')
  })

  it('por debajo del mínimo está bajo', () => {
    expect(estadoStock(insumo({ stock_actual: 40, stock_minimo: 50 }))).toBe('bajo')
  })

  it('por debajo de la mitad del mínimo es crítico', () => {
    expect(estadoStock(insumo({ stock_actual: 20, stock_minimo: 50 }))).toBe('critico')
  })

  it('en cero está agotado, no crítico', () => {
    expect(estadoStock(insumo({ stock_actual: 0, stock_minimo: 50 }))).toBe('agotado')
  })

  it('sin mínimo declarado no se inventa una alarma', () => {
    expect(estadoStock(insumo({ stock_actual: 3, stock_minimo: 0 }))).toBe('ok')
  })

  it('un stock negativo cuenta como agotado', () => {
    expect(estadoStock(insumo({ stock_actual: -5, stock_minimo: 50 }))).toBe('agotado')
  })
})

describe('porcentajeDeStock', () => {
  it('el doble del mínimo llena la barra', () => {
    expect(porcentajeDeStock(insumo({ stock_actual: 100, stock_minimo: 50 }))).toBe(100)
  })

  it('nunca se pasa del 100 aunque haya mucho stock', () => {
    expect(porcentajeDeStock(insumo({ stock_actual: 5000, stock_minimo: 50 }))).toBe(100)
  })

  it('nunca baja de cero', () => {
    expect(porcentajeDeStock(insumo({ stock_actual: -10, stock_minimo: 50 }))).toBe(0)
  })

  it('sin mínimo no divide por cero', () => {
    expect(porcentajeDeStock(insumo({ stock_actual: 10, stock_minimo: 0 }))).toBe(100)
    expect(porcentajeDeStock(insumo({ stock_actual: 0, stock_minimo: 0 }))).toBe(0)
  })
})

describe('resumirInventario', () => {
  it('cuenta cada estado por separado y suma el valor', () => {
    const resumen = resumirInventario([
      insumo({ id: 1, stock_actual: 100, stock_minimo: 50, precio_unitario_cop: 10 }),
      insumo({ id: 2, stock_actual: 40, stock_minimo: 50, precio_unitario_cop: 10 }),
      insumo({ id: 3, stock_actual: 10, stock_minimo: 50, precio_unitario_cop: 10 }),
      insumo({ id: 4, stock_actual: 0, stock_minimo: 50, precio_unitario_cop: 10 }),
    ])
    expect(resumen).toEqual({
      total: 4,
      criticos: 1,
      bajos: 1,
      agotados: 1,
      valorTotalCop: 1500,
    })
  })

  it('un insumo sin precio no rompe la suma', () => {
    const resumen = resumirInventario([insumo({ precio_unitario_cop: null })])
    expect(resumen.valorTotalCop).toBe(0)
  })

  it('una bodega vacía da ceros', () => {
    expect(resumirInventario([])).toEqual({
      total: 0,
      criticos: 0,
      bajos: 0,
      agotados: 0,
      valorTotalCop: 0,
    })
  })
})

describe('ordenarPorUrgencia', () => {
  it('lo que hay que reponer va primero', () => {
    const ordenados = ordenarPorUrgencia([
      insumo({ id: 1, nombre: 'OK', stock_actual: 100, stock_minimo: 50 }),
      insumo({ id: 2, nombre: 'Agotado', stock_actual: 0, stock_minimo: 50 }),
      insumo({ id: 3, nombre: 'Bajo', stock_actual: 40, stock_minimo: 50 }),
      insumo({ id: 4, nombre: 'Crítico', stock_actual: 10, stock_minimo: 50 }),
    ])
    expect(ordenados.map((item) => item.nombre)).toEqual([
      'Agotado',
      'Crítico',
      'Bajo',
      'OK',
    ])
  })

  it('a igual urgencia ordena por nombre', () => {
    const ordenados = ordenarPorUrgencia([
      insumo({ id: 1, nombre: 'Zinc' }),
      insumo({ id: 2, nombre: 'Árnica' }),
    ])
    expect(ordenados.map((item) => item.nombre)).toEqual(['Árnica', 'Zinc'])
  })

  it('no muta el arreglo original', () => {
    const original = [insumo({ id: 1, nombre: 'B' }), insumo({ id: 2, nombre: 'A' })]
    ordenarPorUrgencia(original)
    expect(original[0].nombre).toBe('B')
  })
})

describe('filtrarInsumos', () => {
  const catalogo = [
    insumo({ id: 1, nombre: 'Alimento iniciación', tipo: 'alimento', stock_actual: 100 }),
    insumo({ id: 2, nombre: 'Vacuna Newcastle', tipo: 'sanitario', stock_actual: 10 }),
    insumo({ id: 3, nombre: 'Viruta', tipo: 'cama', activo: false }),
  ]

  it('por defecto oculta los inactivos', () => {
    const visibles = filtrarInsumos(catalogo, '', 'todos')
    expect(visibles.map((item) => item.id)).toEqual([1, 2])
  })

  it('el filtro de inactivos muestra solo esos', () => {
    const visibles = filtrarInsumos(catalogo, '', 'inactivos')
    expect(visibles.map((item) => item.id)).toEqual([3])
  })

  it('reposición deja fuera lo que está OK', () => {
    const visibles = filtrarInsumos(catalogo, '', 'reposicion')
    expect(visibles.map((item) => item.id)).toEqual([2])
  })

  it('busca por nombre y por tipo', () => {
    expect(filtrarInsumos(catalogo, 'vacuna', 'todos').map((i) => i.id)).toEqual([2])
    expect(filtrarInsumos(catalogo, 'alimento', 'todos').map((i) => i.id)).toEqual([1])
  })

  it('la búsqueda ignora mayúsculas y espacios sobrantes', () => {
    expect(filtrarInsumos(catalogo, '  VACUNA  ', 'todos').map((i) => i.id)).toEqual([2])
  })

  it('un insumo sin tipo ni ubicación no rompe la búsqueda', () => {
    const sinDatos = [insumo({ id: 9, nombre: 'Suelto', tipo: null, ubicacion_almacen: null })]
    expect(filtrarInsumos(sinDatos, 'suelto', 'todos')).toHaveLength(1)
    expect(filtrarInsumos(sinDatos, 'bodega', 'todos')).toHaveLength(0)
  })
})

describe('signoDeMovimiento', () => {
  it('la entrada suma y la salida resta', () => {
    expect(signoDeMovimiento('entrada')).toBe('+')
    expect(signoDeMovimiento('salida')).toBe('−')
  })

  it('el ajuste no lleva signo porque fija el stock, no lo desplaza', () => {
    expect(signoDeMovimiento('ajuste')).toBe('')
  })
})
