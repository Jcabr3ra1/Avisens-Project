import { useMemo } from 'react'
import type { Usuario } from '@shared/api'

export type ResumenDeUsuarios = {
  total: number
  activos: number
  inactivos: number
  administradores: number
  propietarios: number
  operarios: number
}

export function useResumenUsuarios(usuarios: Usuario[]): ResumenDeUsuarios {
  return useMemo(
    () => {
      const activos = usuarios.filter((usuario) => usuario.activo).length
      return {
        total: usuarios.length,
        activos,
        inactivos: usuarios.length - activos,
        administradores: usuarios.filter((usuario) => usuario.rol.nombre === 'Administrador').length,
        propietarios: usuarios.filter((usuario) => usuario.rol.nombre === 'Propietario').length,
        operarios: usuarios.filter((usuario) => usuario.rol.nombre === 'Operario').length,
      }
    },
    [usuarios],
  )
}
