import type { Usuario } from '@shared/api'

export type FiltroRolUsuario = 'todos' | 'Administrador' | 'Propietario' | 'Operario'
export type FiltroEstadoUsuario = 'todos' | 'activos' | 'inactivos'

export interface CriteriosDirectorioUsuarios {
  busqueda: string
  rol: FiltroRolUsuario
  estado: FiltroEstadoUsuario
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function filtrarUsuarios(
  usuarios: Usuario[],
  { busqueda, rol, estado }: CriteriosDirectorioUsuarios,
): Usuario[] {
  const termino = normalizar(busqueda)
  return usuarios.filter((usuario) => {
    if (rol !== 'todos' && usuario.rol.nombre !== rol) return false
    if (estado === 'activos' && !usuario.activo) return false
    if (estado === 'inactivos' && usuario.activo) return false
    if (!termino) return true
    return [
      usuario.nombre_completo,
      usuario.username,
      usuario.email ?? '',
      usuario.cedula,
      usuario.telefono ?? '',
      usuario.organizacion?.nombre ?? '',
    ].some((campo) => normalizar(campo).includes(termino))
  })
}

export function siguienteUsuarioId(
  ids: number[],
  actualId: number | null,
  tecla: string,
): number | null {
  if (ids.length === 0) return null
  if (tecla === 'Home') return ids[0]
  if (tecla === 'End') return ids[ids.length - 1]
  if (tecla !== 'ArrowDown' && tecla !== 'ArrowUp') return null
  const indice = actualId === null ? -1 : ids.indexOf(actualId)
  if (indice === -1) return ids[0]
  const siguiente = tecla === 'ArrowDown'
    ? Math.min(indice + 1, ids.length - 1)
    : Math.max(indice - 1, 0)
  return ids[siguiente]
}
