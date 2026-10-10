import { Prisma } from '@prisma/client';

export type ClasificacionFalloAlerta =
  | 'base_de_datos'
  | 'datos_invalidos'
  | 'desconocida';

export interface FalloAlertaClasificado {
  clasificacion: ClasificacionFalloAlerta;
  codigo?: string;
}

/**
 * Clasifica un error de la evaluación de alertas para poder registrarlo sin
 * arriesgar una fuga de datos. Nunca lee `error.message` ni `error.meta`:
 * el mensaje de un PrismaClientValidationError trae los argumentos completos
 * de la consulta, y el de otros errores puede traer host, usuario o base de
 * la cadena de conexión.
 *
 * No desenreda `error.cause` — eso es lo que hace `causaDe` en
 * `llave-foranea.ts`, y hoy no hace falta: aquí no se registra el código
 * SQLSTATE, solo que el fallo es "de base de datos". Si en el futuro se
 * necesita ese código, ahí se evalúa reutilizar esa función.
 */
export function clasificarFalloAlerta(error: unknown): FalloAlertaClasificado {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { clasificacion: 'datos_invalidos' };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { clasificacion: 'base_de_datos', codigo: error.code };
  }

  // El adaptador de pg no siempre mapea el error a una clase de Prisma: a
  // veces sube crudo como DriverAdapterError. Sin `causaDe`, el nombre de la
  // clase ya alcanza para saber que es un fallo de base de datos, aunque no
  // se sepa el código exacto.
  const nombre =
    typeof error === 'object' && error !== null
      ? (error as { name?: unknown }).name
      : undefined;
  if (nombre === 'DriverAdapterError') {
    return { clasificacion: 'base_de_datos' };
  }

  return {
    clasificacion: 'desconocida',
    codigo: error instanceof Error ? error.constructor.name : typeof error,
  };
}
