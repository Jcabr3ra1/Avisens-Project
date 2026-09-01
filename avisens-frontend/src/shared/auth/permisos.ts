// Quién gestiona la estructura productiva (granja → galpón → lote).
//
// Regla del producto: SOLO el administrador la crea y la administra. El
// administrador arma granja, galpón y lote y se los asigna al propietario;
// el propietario los consulta y trabaja sobre ellos, pero no los edita, no
// los activa ni desactiva, y no los borra.
//
// Ojo: esto NO es seguridad, es honestidad de la interfaz — evita ofrecer
// botones que el backend va a rechazar. Quien decide de verdad es el
// backend, en los @Roles() de sus controladores.

export const ROL_ADMIN = 'Administrador'
export const ROL_PROPIETARIO = 'Propietario'
export const ROL_OPERARIO = 'Operario'

export type PermisosGestion = {
  crear: boolean
  editar: boolean
  alternarActivo: boolean
  eliminar: boolean
}

const SIN_PERMISOS: PermisosGestion = {
  crear: false,
  editar: false,
  alternarActivo: false,
  eliminar: false,
}

const TODOS_LOS_PERMISOS: PermisosGestion = {
  crear: true,
  editar: true,
  alternarActivo: true,
  eliminar: true,
}

export function permisosDeGestion(rol: string | null): PermisosGestion {
  return rol === ROL_ADMIN ? TODOS_LOS_PERMISOS : SIN_PERMISOS
}

// ¿Hay alguna acción de gestión que mostrar? Sirve para no dibujar
// separadores ni columnas de acciones vacías.
export function gestionaAlgo(permisos: PermisosGestion): boolean {
  return permisos.editar || permisos.alternarActivo || permisos.eliminar
}
