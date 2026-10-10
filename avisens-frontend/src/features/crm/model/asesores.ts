import { ROL_ADMIN } from '@shared/auth/permisos'
import type { Usuario } from '@shared/api'

export function asesoresPosibles(usuarios: Usuario[]): Usuario[] {
  return usuarios.filter(
    (usuario) => usuario.activo && usuario.rol?.nombre === ROL_ADMIN,
  )
}
