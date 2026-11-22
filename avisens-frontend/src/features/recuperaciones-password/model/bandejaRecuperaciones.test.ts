import { describe, expect, it } from 'vitest'
import type { RecuperacionPassword } from './recuperacionPassword'
import {
  filtrarRecuperaciones,
  resumirRecuperaciones,
  siguienteRecuperacionId,
} from './bandejaRecuperaciones'

function solicitud(parcial: Partial<RecuperacionPassword> & { id: number }): RecuperacionPassword {
  return {
    estado: 'pendiente',
    motivo: 'Olvidé mi clave',
    fecha_creacion: '2026-10-16T10:00:00Z',
    atendida_en: null,
    observacion: null,
    usuario: {
      id: parcial.id,
      nombre_completo: 'Ana Pérez',
      username: 'aperez',
      email: 'ana@avisens.co',
      cedula: '10203040',
      activo: true,
    },
    atendida_por: null,
    ...parcial,
  }
}

describe('resumirRecuperaciones y filtrarRecuperaciones', () => {
  const lista: RecuperacionPassword[] = [
    solicitud({ id: 1, estado: 'completada', fecha_creacion: '2026-10-16T12:00:00Z' }),
    solicitud({ id: 2, estado: 'pendiente', fecha_creacion: '2026-10-15T10:00:00Z', usuario: { id: 2, nombre_completo: 'José Ñúñez', username: 'jnunez', email: null, cedula: '99887766', activo: true } }),
    solicitud({ id: 3, estado: 'aprobada', fecha_creacion: '2026-10-16T11:00:00Z' }),
    solicitud({ id: 4, estado: 'rechazada', fecha_creacion: '2026-10-16T13:00:00Z' }),
  ]

  it('resume pendientes, aprobadas, cerradas y total', () => {
    expect(resumirRecuperaciones(lista)).toEqual({
      pendientes: 1,
      aprobadas: 1,
      cerradas: 2,
      total: 4,
    })
  })

  it('ordena pendientes primero, luego aprobadas y luego cerradas más recientes', () => {
    expect(filtrarRecuperaciones(lista, { vista: 'todos', busqueda: '' }).map((s) => s.id)).toEqual([2, 3, 4, 1])
  })

  it('filtra por vista cerradas (completadas + rechazadas) y busca sin tildes', () => {
    expect(filtrarRecuperaciones(lista, { vista: 'cerradas', busqueda: '' }).map((s) => s.id)).toEqual([4, 1])
    expect(filtrarRecuperaciones(lista, { vista: 'todos', busqueda: 'nunez' }).map((s) => s.id)).toEqual([2])
    expect(filtrarRecuperaciones(lista, { vista: 'todos', busqueda: '998877' }).map((s) => s.id)).toEqual([2])
  })
})

describe('siguienteRecuperacionId', () => {
  it('mueve la selección por teclado sin desbordar', () => {
    expect(siguienteRecuperacionId([5, 6, 7], 5, 'ArrowDown')).toBe(6)
    expect(siguienteRecuperacionId([5, 6, 7], 7, 'ArrowDown')).toBe(7)
    expect(siguienteRecuperacionId([5, 6, 7], 6, 'ArrowUp')).toBe(5)
    expect(siguienteRecuperacionId([5, 6, 7], 5, 'ArrowUp')).toBe(5)
    expect(siguienteRecuperacionId([5, 6, 7], 6, 'Home')).toBe(5)
    expect(siguienteRecuperacionId([5, 6, 7], 5, 'End')).toBe(7)
    expect(siguienteRecuperacionId([5, 6, 7], 5, 'Enter')).toBeNull()
    expect(siguienteRecuperacionId([], null, 'ArrowDown')).toBeNull()
  })
})
