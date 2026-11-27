/**
 * Reconocer una violación de llave foránea, venga como venga.
 *
 * Prisma 7 con el adaptador de pg no siempre la entrega como
 * PrismaClientKnownRequestError con código P2003. Cuando el error sube desde el
 * driver la envuelve en DriverAdapterError, que es otra clase y no lleva código
 * P: por eso un `catch` que sólo mire `error.code === 'P2003'` la deja pasar, y
 * el filtro de Prisma —que atrapa por clase— ni se entera. Así llegaba a
 * producción como un 500 sin mensaje.
 */
const CODIGO_POSTGRES = '23503';

type Causa = {
  kind?: string;
  originalCode?: string;
  originalMessage?: string;
  constraint?: { index?: string; fields?: string[] };
};

/**
 * El detalle del driver, esté donde esté.
 *
 * Llega en dos sitios distintos según quién lo envuelva: si sube crudo, en
 * `error.cause`; si Prisma lo mapeó a P2003, anidado en
 * `error.meta.driverAdapterError.cause`. Mirar sólo uno de los dos deja la
 * mitad de los casos sin nombre de tabla y el mensaje se queda en genérico.
 */
/**
 * El texto del error, mire donde mire.
 *
 * En producción la violación no llegaba ni con código P2003 ni con `kind`:
 * subía como un DriverAdapterError crudo cuyo único rastro era el mensaje de
 * Postgres. Se leen el mensaje propio y el del driver, que según la versión de
 * Postgres dice «violates foreign key constraint» o «violates RESTRICT setting
 * of foreign key constraint».
 */
const PATRON_MENSAJE = /violates (?:\w+ setting of )?foreign key constraint/i;

function textoDe(error: unknown): string {
  const { message } = error as { message?: unknown };
  const propio = typeof message === 'string' ? message : '';
  const delDriver = causaDe(error)?.originalMessage ?? '';
  return `${propio} ${delDriver}`;
}

function causaDe(error: unknown): Causa | null {
  if (typeof error !== 'object' || error === null) return null;

  const { cause } = error as { cause?: Causa };
  if (typeof cause === 'object' && cause !== null) return cause;

  const { meta } = error as {
    meta?: { driverAdapterError?: { cause?: Causa } };
  };
  const anidada = meta?.driverAdapterError?.cause;
  if (typeof anidada === 'object' && anidada !== null) return anidada;

  return null;
}

export function esViolacionDeLlaveForanea(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  // Camino 1: Prisma la mapeó y le puso código.
  if ((error as { code?: unknown }).code === 'P2003') return true;

  // Camino 2: subió desde el driver sin mapear.
  const causa = causaDe(error);
  if (
    causa?.kind === 'ForeignKeyConstraintViolation' ||
    causa?.originalCode === CODIGO_POSTGRES
  ) {
    return true;
  }

  // Camino 3: subió crudo y sin clasificar, sólo con el mensaje de Postgres.
  return PATRON_MENSAJE.test(textoDe(error));
}

/**
 * El nombre de la tabla que impide el borrado, sacado de la restricción.
 *
 * Postgres las nombra `<tabla>_<columna>_fkey`, así que
 * `registros_mortalidad_lote_id_fkey` da `registros_mortalidad`. Sirve para
 * decirle a quien borra qué es lo que lo bloquea, en vez de un «no se pudo».
 */
export function tablaQueBloquea(error: unknown): string | null {
  const causa = causaDe(error);
  const desdeElMensaje = textoDe(error).match(
    /foreign key constraint "([^"]+)"/i,
  )?.[1];
  const indice =
    causa?.constraint?.index ??
    ((error as { meta?: { constraint?: unknown } }).meta?.constraint as
      | string
      | undefined) ??
    desdeElMensaje;
  if (typeof indice !== 'string') return null;

  const sinSufijo = indice.replace(/_fkey$/, '');
  // Se recorta la columna final (`_lote_id`, `_galpon_id`) para quedarse con la
  // tabla. Si el nombre no sigue el patrón, se devuelve tal cual antes que
  // inventar algo.
  const conColumna = sinSufijo.match(/^(.*)_[a-z0-9]+_id$/);
  return (conColumna ? conColumna[1] : sinSufijo) || null;
}

const NOMBRES: Record<string, string> = {
  registros_mortalidad: 'registros de mortalidad',
  pesajes: 'pesajes',
  consumos_diarios: 'consumos diarios',
  registros_plagas: 'registros de plagas',
  eventos_sanitarios: 'eventos sanitarios',
  indicadores_lote: 'indicadores calculados',
  alertas: 'alertas',
  galpones: 'galpones',
  lotes: 'lotes',
  sensores: 'sensores',
  equipos: 'equipos',
  dispositivos: 'dispositivos',
  zonas_galpon: 'zonas',
  movimientos_inventario: 'movimientos de inventario',
  inventario_insumos: 'insumos',
  usuarios_galpones: 'asignaciones de personal',
};

/** El nombre de la tabla en castellano, para un mensaje que alguien vaya a leer. */
export function nombreLegible(tabla: string | null): string | null {
  if (!tabla) return null;
  return NOMBRES[tabla] ?? tabla.replace(/_/g, ' ');
}
