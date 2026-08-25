export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  PROPIETARIO: 'Propietario',
  OPERARIO: 'Operario',
} as const;

export type RolNombre = (typeof ROLES)[keyof typeof ROLES];
