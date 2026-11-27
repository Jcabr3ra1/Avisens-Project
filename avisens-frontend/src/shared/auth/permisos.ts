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

// Bodega: el catálogo de insumos de una granja lo administran el
// administrador y su propietario (HU-58: el propietario da de alta lo que
// compra). Borrar definitivo sigue siendo solo del administrador.
// Fuente: avisens-backend/src/modules/insumos/insumos.controller.ts
//
// Auditoría QA del 2026-10-30 (HALL-01 / CP-06): el operario maneja
// cantidades físicas, no dinero. No ve precios ni el valor de la bodega.
// Desde el 2026-11-21 tampoco registra movimientos: consulta el stock de su
// bodega y los movimientos (entradas, salidas y ajustes) son del
// administrador y del propietario.
// Ojo: el backend todavía le acepta movimientos y le devuelve el precio; esto
// es solo la interfaz.
export type TipoMovimientoInsumo = 'entrada' | 'salida' | 'ajuste'

export type PermisosInsumo = {
  crear: boolean
  editar: boolean
  alternarActivo: boolean
  eliminar: boolean
  registrarMovimiento: boolean
  tiposMovimiento: TipoMovimientoInsumo[]
  verCostos: boolean
}

export function permisosDeInsumo(rol: string | null): PermisosInsumo {
  const esAdmin = rol === ROL_ADMIN
  const gestionaBodega = esAdmin || rol === ROL_PROPIETARIO
  const tiposMovimiento: TipoMovimientoInsumo[] = gestionaBodega
    ? ['entrada', 'salida', 'ajuste']
    : []
  return {
    crear: gestionaBodega,
    editar: gestionaBodega,
    alternarActivo: gestionaBodega,
    eliminar: esAdmin,
    registrarMovimiento: tiposMovimiento.length > 0,
    tiposMovimiento,
    verCostos: gestionaBodega,
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

// Cierre y liquidación del lote (HU-51).
// Permitido al Administrador y al Propietario (dueño del galpón).
export function puedeCerrarLote(rol: string | null): boolean {
  return rol === ROL_ADMIN || rol === ROL_PROPIETARIO
}
