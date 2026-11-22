import { describe, expect, it } from 'vitest'
import type { Usuario } from '@shared/api'
import { filtrarUsuarios, siguienteUsuarioId } from './directorioUsuarios'

function usuario(parcial: Partial<Usuario> & { id: number }): Usuario {
  return {
    nombre_completo: 'María Gómez',
    username: 'mgomez',
    email: 'maria@avisens.co',
    cedula: '10203040',
    telefono: '3001234567',
    activo: true,
    fecha_creacion: '2026-10-01T10:00:00Z',
    organizacion_id: 1,
    rol: { id: 2, nombre: 'Propietario' },
    organizacion: { id: 1, nombre: 'Avícola El Sol' },
    ...parcial,
  }
}

describe('filtrarUsuarios', () => {
  const lista = [
    usuario({ id: 1, nombre_completo: 'Carlos Admin', username: 'cadmin', rol: { id: 1, nombre: 'Administrador' }, organizacion: null, organizacion_id: null }),
    usuario({ id: 2, nombre_completo: 'María Gómez', username: 'mgomez', rol: { id: 2, nombre: 'Propietario' }, activo: true }),
    usuario({ id: 3, nombre_completo: 'José Ñúñez', username: 'jnunez', rol: { id: 3, nombre: 'Operario' }, activo: false, cedula: '99887766', organizacion: { id: 2, nombre: 'Granja La Palma' } }),
  ]

  it('filtra por rol y estado de acceso', () => {
    expect(filtrarUsuarios(lista, { busqueda: '', rol: 'Operario', estado: 'todos' }).map((u) => u.id)).toEqual([3])
    expect(filtrarUsuarios(lista, { busqueda: '', rol: 'todos', estado: 'activos' }).map((u) => u.id)).toEqual([1, 2])
    expect(filtrarUsuarios(lista, { busqueda: '', rol: 'todos', estado: 'inactivos' }).map((u) => u.id)).toEqual([3])
  })

  it('busca sin tildes por nombre, usuario, cédula u organización', () => {
    expect(filtrarUsuarios(lista, { busqueda: 'nunez', rol: 'todos', estado: 'todos' }).map((u) => u.id)).toEqual([3])
    expect(filtrarUsuarios(lista, { busqueda: 'palma', rol: 'todos', estado: 'todos' }).map((u) => u.id)).toEqual([3])
    expect(filtrarUsuarios(lista, { busqueda: '998877', rol: 'todos', estado: 'todos' }).map((u) => u.id)).toEqual([3])
  })
})

describe('siguienteUsuarioId', () => {
  it('mueve la selección por teclado sin desbordar', () => {
    expect(siguienteUsuarioId([10, 20, 30], 10, 'ArrowDown')).toBe(20)
    expect(siguienteUsuarioId([10, 20, 30], 30, 'ArrowDown')).toBe(30)
    expect(siguienteUsuarioId([10, 20, 30], 20, 'ArrowUp')).toBe(10)
    expect(siguienteUsuarioId([10, 20, 30], 10, 'ArrowUp')).toBe(10)
    expect(siguienteUsuarioId([10, 20, 30], 20, 'Home')).toBe(10)
    expect(siguienteUsuarioId([10, 20, 30], 10, 'End')).toBe(30)
    expect(siguienteUsuarioId([10, 20, 30], 10, 'Escape')).toBeNull()
    expect(siguienteUsuarioId([], null, 'ArrowDown')).toBeNull()
  })
})
