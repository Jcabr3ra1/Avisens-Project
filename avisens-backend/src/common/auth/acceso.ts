import { ForbiddenException } from '@nestjs/common';
import { ROLES } from './roles';

export type Solicitante = { id: number; rol: string };

export function esPropietario(solicitante: Solicitante): boolean {
  return solicitante.rol === ROLES.PROPIETARIO;
}

export function verificarDueno(
  solicitante: Solicitante,
  propietarioId: number,
  mensaje: string,
): void {
  if (esPropietario(solicitante) && propietarioId !== solicitante.id) {
    throw new ForbiddenException(mensaje);
  }
}
