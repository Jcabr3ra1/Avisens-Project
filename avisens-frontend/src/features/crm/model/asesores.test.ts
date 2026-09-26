import { describe, expect, it } from 'vitest'
import type { Usuario } from '@shared/api'
import { asesoresPosibles } from './asesores'

function usuario(id: number, rol: string, activo = true): Usuario {
  return { id, activo, nombre_completo: `Usuario ${id}`, rol: { nombre: rol } } as Usuario
}

describe('asesoresPosibles', () => {
  it('solo ofrece administradores', () => {
    const posibles = asesoresPosibles([
      usuario(1, 'Administrador'),
      usuario(2, 'Propietario'),
      usuario(3, 'Operario'),
    ])
    expect(posibles.map((item) => item.id)).toEqual([1])
  })

  it('un administrador desactivado no puede atender a nadie', () => {
    const posibles = asesoresPosibles([
      usuario(1, 'Administrador', false),
      usuario(2, 'Administrador'),
    ])
    expect(posibles.map((item) => item.id)).toEqual([2])
  })

  it('aguanta que el usuario llegue sin rol', () => {
    const sinRol = { id: 9, activo: true } as Usuario
    expect(asesoresPosibles([sinRol])).toEqual([])
  })
})
