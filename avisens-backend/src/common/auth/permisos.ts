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
