import { ROL_ADMIN } from '@shared/auth/permisos'
import type { Usuario } from '@shared/api'

// Quién puede atender un prospecto.
//
// El CRM es el embudo comercial de Avisens: un prospecto es alguien que
// todavía NO es cliente. Quien lo atiende pertenece al equipo de Avisens, y
// hoy eso significa un Administrador — no existe un rol 'Asesor', asesor es la
// función que cumple, no su rol.
//
// Un Propietario o un Operario son clientes: asignarles un prospecto
// significaría que un cliente lleva las ventas de su propio proveedor.
export function asesoresPosibles(usuarios: Usuario[]): Usuario[] {
  return usuarios.filter(
    (usuario) => usuario.activo && usuario.rol?.nombre === ROL_ADMIN,
  )
}
