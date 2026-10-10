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

// Bodega: el catálogo de insumos lo administra el administrador, pero el
// movimiento de stock lo registran los tres roles — el operario apunta lo
// que consume en campo y esa es la razón de ser del módulo.
// Fuente: avisens-backend/src/modules/insumos/insumos.controller.ts
export type PermisosInsumo = {
  crear: boolean
  editar: boolean
  alternarActivo: boolean
  eliminar: boolean
  registrarMovimiento: boolean
}

export function permisosDeInsumo(rol: string | null): PermisosInsumo {
  const esAdmin = rol === ROL_ADMIN
  return {
    crear: esAdmin,
    editar: esAdmin,
    alternarActivo: esAdmin,
    eliminar: esAdmin,
    registrarMovimiento:
      rol === ROL_ADMIN || rol === ROL_PROPIETARIO || rol === ROL_OPERARIO,
  }
}

// Funciones operativas del galpón: sensores, dispositivos, equipos (con sus
// mantenimientos y repuestos) y umbrales ambientales. Las configura el
// propietario, que es quien opera su granja. El administrador gestiona la
// estructura (granja → galpón → lote) y la operación solo la consulta.
//
// Ojo: el backend todavía acepta estas escrituras del Administrador
// (@Roles(ADMINISTRADOR, PROPIETARIO) en sensores, dispositivos, equipos,
// mantenimiento y umbrales). Mientras no se cierre allí, esto es honestidad de
// la interfaz, no seguridad: quitar ADMINISTRADOR de esos @Roles queda como
// pendiente del backend.
export type PermisosOperativosGalpon = {
  configurar: boolean
  // Borrado definitivo (/permanente): el backend solo lo permite al
  // Administrador, que aquí es de solo lectura. La baja normal es desactivar.
  eliminarDefinitivo: boolean
}

export function permisosOperativosDeGalpon(rol: string | null): PermisosOperativosGalpon {
  return { configurar: rol === ROL_PROPIETARIO, eliminarDefinitivo: false }
}

// Plan de crecimiento y estimación de alimento del lote (Fase 1 / 2A / 2B).
// El administrador y el propietario calculan o recalculan; el operario solo
// consulta el resultado.
// Fuente: avisens-backend/src/modules/plan-lote/plan-lote.controller.ts,
// avisens-backend/src/modules/plan-alimento/plan-alimento.controller.ts
export type PermisosPlan = {
  registrar: boolean
}

export function permisosDePlan(rol: string | null): PermisosPlan {
  return { registrar: rol === ROL_ADMIN || rol === ROL_PROPIETARIO }
}
