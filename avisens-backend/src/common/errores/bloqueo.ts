/**
 * Reconocer que Postgres canceló una sentencia por lock_timeout (55P03).
 *
 * Con el adaptador de pg llega de dos formas, verificadas contra Postgres:
 * un DriverAdapterError crudo con el detalle en `error.cause`, o un
 * PrismaClientKnownRequestError P2010 (consulta cruda) con el detalle anidado
 * en `error.meta.driverAdapterError.cause`. Se acepta SOLO ese código en esas
 * dos formas: un deadlock (40P01), un P2028 de transacción vencida o
 * cualquier otro fallo no son «el galpón está ocupado» y deben seguir su
 * camino.
 */
const CODIGO_LOCK_TIMEOUT = '55P03';

export interface CausaDelAdaptador {
  originalCode?: unknown;
  originalMessage?: unknown;
}

type Causa = CausaDelAdaptador | null | undefined;

export function causaDelAdaptador(error: unknown): Causa {
  if (typeof error !== 'object' || error === null) return null;
  const candidato = error as {
    name?: unknown;
    code?: unknown;
    cause?: Causa;
    meta?: { driverAdapterError?: { cause?: Causa } };
  };

  if (candidato.name === 'DriverAdapterError') {
    return candidato.cause;
  }
  if (candidato.code === 'P2010') {
    return candidato.meta?.driverAdapterError?.cause;
  }
  return null;
}

export function esTimeoutDeBloqueo(error: unknown): boolean {
  return causaDelAdaptador(error)?.originalCode === CODIGO_LOCK_TIMEOUT;
}

export const MENSAJE_GALPON_OCUPADO =
  'El galpón está siendo modificado por otra operación; intenta de nuevo';

export const MENSAJE_ASIGNACION_OCUPADA =
  'Hay otra operación modificando los datos de esta asignación; intenta de nuevo';

export const MENSAJE_USUARIO_OCUPADO =
  'El usuario está siendo modificado por otra operación; intenta de nuevo';

export const MENSAJE_ORGANIZACION_OCUPADA =
  'La organización está siendo modificada por otra operación; intenta de nuevo';
