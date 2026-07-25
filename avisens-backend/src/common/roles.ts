// Nombres de rol tal como existen en la tabla `roles` (ver prisma/seeds).
// Centralizados para evitar typos: un string suelto mal escrito compila y
// falla en runtime; una constante mal escrita no compila.
export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  PROPIETARIO: 'Propietario',
  OPERARIO: 'Operario',
} as const;

export type RolNombre = (typeof ROLES)[keyof typeof ROLES];
