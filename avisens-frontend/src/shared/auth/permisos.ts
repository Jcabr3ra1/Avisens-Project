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

// Excepción acordada el 2026-10-18: el propietario completa los datos
// descriptivos de lo suyo (ubicación de la granja, medidas del galpón, raza y
// línea genética del lote) por las rutas PATCH …/:id/datos. No crea ni borra.
export function puedeCompletarDatos(rol: string | null): boolean {
  return rol === ROL_ADMIN || rol === ROL_PROPIETARIO
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

// Registros productivos (pesajes, mortalidad y eventos sanitarios de la
// bitácora, y consumos diarios): los tres roles los crean y los editan, pero
// solo el administrador y el propietario los eliminan. El operario apunta lo
// que pasa en campo; corregir un dato suyo es parte de su trabajo, pero borrar
// el historial no. Mostrarle «Eliminar» solo le daba un 403.
// Fuente: los controladores de pesajes, registros-mortalidad,
// eventos-sanitarios y consumos-diarios — la clase incluye al Operario (crear
// y @Patch), pero su @Delete es solo de Administrador y Propietario.
export type PermisosRegistro = {
  editar: boolean
  eliminar: boolean
}

export function permisosDeRegistro(rol: string | null): PermisosRegistro {
  const puedeOperar =
    rol === ROL_ADMIN || rol === ROL_PROPIETARIO || rol === ROL_OPERARIO
  return {
    editar: puedeOperar,
    eliminar: rol === ROL_ADMIN || rol === ROL_PROPIETARIO,
  }
}

// Proveedores: el directorio lo administra solo el administrador
// (proveedores:gestionar). El operario lo consulta desde su Bodega para saber
// a quién pedir un insumo (proveedores:leer), sin crear, editar ni borrar.
// Fuente: avisens-backend/src/modules/proveedores/proveedores.controller.ts y
// avisens-backend/src/common/auth/permisos.ts
export type PermisosProveedor = {
  gestionar: boolean
}

export function permisosDeProveedor(rol: string | null): PermisosProveedor {
  return { gestionar: rol === ROL_ADMIN }
}

// Equipos, mantenimientos, repuestos y umbrales ambientales siguen la regla
// operativa del propietario. Dispositivos ESP32 y sensores se administran por
// separado y son exclusivos del administrador AVISENS.
//
// Esto solo controla la visibilidad de la interfaz. La autorización real está
// en los roles declarados por cada controlador del backend.
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
