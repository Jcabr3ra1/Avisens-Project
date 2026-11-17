import { describe, expect, it } from 'vitest'
import type { OrdenCompra } from './ordenCompra'
import {
  desempenoPorProveedor,
  notaValida,
  pendienteDeEvaluar,
  promedioDeOrden,
  semaforoDe,
} from './evaluacionProveedor'

type Notas = [number | null, number | null, number | null]

function orden(proveedorId: number, notas: Notas, estado: OrdenCompra['estado'] = 'entregada') {
  return {
    proveedor_id: proveedorId,
    proveedor: { id: proveedorId, nombre: `Proveedor ${proveedorId}`, nit: `900${proveedorId}` },
    estado,
    calificacion_cumplimiento: notas[0],
    calificacion_calidad: notas[1],
    calificacion_tiempo: notas[2],
  }
}

describe('semaforoDe', () => {
  it('verde desde 4, ámbar desde 3 y rojo por debajo', () => {
    expect(semaforoDe(5)).toBe('verde')
    expect(semaforoDe(4)).toBe('verde')
    expect(semaforoDe(3.9)).toBe('ambar')
    expect(semaforoDe(3)).toBe('ambar')
    expect(semaforoDe(2.9)).toBe('rojo')
  })
})

describe('promedioDeOrden', () => {
  it('promedia los tres criterios con un decimal', () => {
    expect(promedioDeOrden(orden(1, [5, 4, 4]))).toBe(4.3)
  })

  it('un pedido sin todas las notas no tiene promedio', () => {
    expect(promedioDeOrden(orden(1, [5, null, 4]))).toBeNull()
  })
})

describe('pendienteDeEvaluar', () => {
  it('solo los entregados sin calificar quedan pendientes', () => {
    expect(pendienteDeEvaluar(orden(1, [null, null, null]))).toBe(true)
    expect(pendienteDeEvaluar(orden(1, [5, 5, 5]))).toBe(false)
    expect(pendienteDeEvaluar(orden(1, [null, null, null], 'pendiente'))).toBe(false)
    expect(pendienteDeEvaluar(orden(1, [null, null, null], 'cancelada'))).toBe(false)
  })
})

describe('desempenoPorProveedor', () => {
  it('promedia cada criterio sobre los pedidos calificados del proveedor', () => {
    const [resultado] = desempenoPorProveedor([orden(1, [5, 4, 3]), orden(1, [3, 4, 5])])
    expect(resultado.evaluaciones).toBe(2)
    expect(resultado.criterios).toEqual({
      calificacion_cumplimiento: 4,
      calificacion_calidad: 4,
      calificacion_tiempo: 4,
    })
    expect(resultado.promedio).toBe(4)
    expect(resultado.semaforo).toBe('verde')
  })

  it('ignora pedidos sin calificar o no entregados', () => {
    const resultado = desempenoPorProveedor([
      orden(1, [null, null, null]),
      orden(2, [5, 5, 5], 'cancelada'),
    ])
    expect(resultado).toEqual([])
  })

  it('ordena del mejor al peor', () => {
    const resultado = desempenoPorProveedor([orden(1, [2, 2, 2]), orden(2, [5, 5, 4])])
    expect(resultado.map((item) => item.proveedorId)).toEqual([2, 1])
    expect(resultado[1].semaforo).toBe('rojo')
  })
})

describe('notaValida', () => {
  it('acepta enteros de 1 a 5', () => {
    expect(notaValida(1)).toBe(true)
    expect(notaValida(5)).toBe(true)
    expect(notaValida(0)).toBe(false)
    expect(notaValida(6)).toBe(false)
    expect(notaValida(3.5)).toBe(false)
    expect(notaValida(null)).toBe(false)
  })
})
