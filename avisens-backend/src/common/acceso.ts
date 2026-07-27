import { ForbiddenException } from '@nestjs/common';
import { ROLES } from './roles';

// Quién hace la petición. Su rol decide el alcance de lo que puede ver/tocar.
// - Administrador: todo.
// - Propietario: solo lo que cuelga de sus propias granjas.
export type Solicitante = { id: number; rol: string };

export function esPropietario(solicitante: Solicitante): boolean {
  return solicitante.rol === ROLES.PROPIETARIO;
}

// El Propietario solo puede tocar lo suyo. Recibe el id del dueño ya resuelto
// (subiendo por las relaciones hasta granja.propietario_id) y lanza 403 si no
// coincide. El Administrador pasa siempre.
export function verificarDueno(
  solicitante: Solicitante,
  propietarioId: number,
  mensaje: string,
): void {
  if (esPropietario(solicitante) && propietarioId !== solicitante.id) {
    throw new ForbiddenException(mensaje);
  }
}
