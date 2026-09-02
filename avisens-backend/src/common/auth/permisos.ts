import { ROLES } from './roles';

export const PERMISOS = {
  ORGANIZACIONES_GESTIONAR: 'organizaciones:gestionar',
  USUARIOS_GESTIONAR: 'usuarios:gestionar',
  CATALOGOS_LEER: 'catalogos:leer',
  CATALOGOS_GESTIONAR: 'catalogos:gestionar',
  PROVEEDORES_LEER: 'proveedores:leer',
  PROVEEDORES_GESTIONAR: 'proveedores:gestionar',
  INFRAESTRUCTURA_LEER: 'infraestructura:leer',
  INFRAESTRUCTURA_GESTIONAR: 'infraestructura:gestionar',
  OPERACION_REGISTRAR: 'operacion:registrar',
  FINANZAS_GESTIONAR: 'finanzas:gestionar',
  INVENTARIO_GESTIONAR: 'inventario:gestionar',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

const TODOS = Object.values(PERMISOS);

// FUENTE DE VERDAD de la autorización. PermisosGuard lee de aquí, no de la
// tabla roles_permisos: esa tabla es una PROYECCIÓN que el seed deriva de
// este objeto, y existe para poder consultar desde SQL qué puede hacer cada
// rol. Editarla a mano no cambia lo que la API permite.
export const PERMISOS_POR_ROL: Readonly<Record<string, readonly Permiso[]>> = {
  [ROLES.ADMINISTRADOR]: TODOS,
  [ROLES.PROPIETARIO]: [
    PERMISOS.USUARIOS_GESTIONAR,
    PERMISOS.CATALOGOS_LEER,
    PERMISOS.PROVEEDORES_LEER,
    PERMISOS.INFRAESTRUCTURA_LEER,
    PERMISOS.INFRAESTRUCTURA_GESTIONAR,
    PERMISOS.OPERACION_REGISTRAR,
    PERMISOS.FINANZAS_GESTIONAR,
    PERMISOS.INVENTARIO_GESTIONAR,
  ],
  [ROLES.OPERARIO]: [
    PERMISOS.CATALOGOS_LEER,
    PERMISOS.INFRAESTRUCTURA_LEER,
    PERMISOS.OPERACION_REGISTRAR,
    PERMISOS.PROVEEDORES_LEER,
  ],
};

export function rolTienePermisos(
  rol: string,
  requeridos: readonly Permiso[],
): boolean {
  const concedidos = PERMISOS_POR_ROL[rol] ?? [];
  return requeridos.every((permiso) => concedidos.includes(permiso));
}

export function permisosDelRol(rol: string): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol] ?? [];
}

/**
 * Los pares rol-permiso que la tabla roles_permisos debe contener, ni uno
 * más ni uno menos.
 *
 * El seed sembraba solo hacia adelante: si a un rol se le quitaba un permiso
 * aquí, la fila vieja se quedaba en la base para siempre y la proyección
 * pasaba a decir algo que el código ya no dice. Comparar contra esta lista es
 * lo que permite borrar lo que sobra.
 */
export function paresRolPermiso(): ReadonlyArray<{
  rol: string;
  permiso: Permiso;
}> {
  return Object.entries(PERMISOS_POR_ROL).flatMap(([rol, permisos]) =>
    permisos.map((permiso) => ({ rol, permiso })),
  );
}

export function esPermisoConocido(codigo: string): codigo is Permiso {
  return (TODOS as readonly string[]).includes(codigo);
}
