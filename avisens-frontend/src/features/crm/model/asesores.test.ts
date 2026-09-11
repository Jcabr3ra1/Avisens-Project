import { describe, expect, it } from 'vitest'
import type { Usuario } from '@shared/api'
import { asesoresPosibles } from './asesores'

function usuario(id: number, rol: string, activo = true): Usuario {
  return { id, activo, nombre_completo: `Usuario ${id}`, rol: { nombre: rol } } as Usuario
}

describe('asesoresPosibles', () => {
  it('solo ofrece administradores', () => {
    // Un prospecto es alguien que todavía no es cliente, así que lo atiende el
    // equipo de Avisens. Ofrecer un propietario significaría que un cliente
    // lleva las ventas de su propio proveedor.
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
    // El listado viene del backend y `rol` podría faltar en una respuesta
    // parcial: antes de reventar, mejor no ofrecerlo como asesor.
    const sinRol = { id: 9, activo: true } as Usuario
    expect(asesoresPosibles([sinRol])).toEqual([])
  })
})
