import {
  esViolacionDeLlaveForanea,
  nombreLegible,
  tablaQueBloquea,
} from './llave-foranea';

/**
 * La forma real con la que llegó a producción: el adaptador de pg envuelve el
 * fallo en DriverAdapterError, que no es PrismaClientKnownRequestError y no
 * lleva código P. Por eso el filtro no la atrapaba y salía un 500.
 */
const errorDelDriver = () => {
  const e = new Error(
    'update or delete on table "lotes" violates RESTRICT setting of foreign key ' +
      'constraint "registros_mortalidad_lote_id_fkey" on table "registros_mortalidad"',
  );
  e.name = 'DriverAdapterError';
  (e as Error & { cause: unknown }).cause = {
    kind: 'ForeignKeyConstraintViolation',
    originalCode: '23503',
    constraint: { index: 'registros_mortalidad_lote_id_fkey' },
  };
  return e;
};

/**
 * La forma real cuando Prisma sí la mapea: el detalle del driver queda
 * anidado en meta.driverAdapterError, no suelto en la raíz.
 */
const errorDePrisma = () =>
  Object.assign(new Error('FK'), {
    code: 'P2003',
    meta: {
      modelName: 'Lote',
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: {
          kind: 'ForeignKeyConstraintViolation',
          originalCode: '23503',
          constraint: { index: 'pesajes_lote_id_fkey' },
        },
      },
    },
  });

describe('esViolacionDeLlaveForanea', () => {
  it('reconoce la que sube desde el driver sin código P', () => {
    expect(esViolacionDeLlaveForanea(errorDelDriver())).toBe(true);
  });

  it('sigue reconociendo la que Prisma mapea como P2003', () => {
    expect(esViolacionDeLlaveForanea(errorDePrisma())).toBe(true);
  });

  it('reconoce por el código de Postgres aunque falte el kind', () => {
    const e = Object.assign(new Error('x'), {
      cause: { originalCode: '23503' },
    });
    expect(esViolacionDeLlaveForanea(e)).toBe(true);
  });

  it('no confunde otros fallos con una llave foránea', () => {
    expect(esViolacionDeLlaveForanea(new Error('se cayó la conexión'))).toBe(false);
    expect(esViolacionDeLlaveForanea({ code: 'P2002' })).toBe(false);
    expect(esViolacionDeLlaveForanea(null)).toBe(false);
    expect(esViolacionDeLlaveForanea(undefined)).toBe(false);
    expect(esViolacionDeLlaveForanea('texto')).toBe(false);
  });
});

describe('tablaQueBloquea', () => {
  it('saca la tabla del nombre de la restricción', () => {
    expect(tablaQueBloquea(errorDelDriver())).toBe('registros_mortalidad');
  });

  // Cuando Prisma lo mapea, el detalle no está en la raíz sino anidado en
  // meta.driverAdapterError. Mirar sólo error.cause dejaba este caso sin
  // nombre y el mensaje se quedaba en el genérico.
  it('también cuando viene anidado en el meta de Prisma', () => {
    expect(tablaQueBloquea(errorDePrisma())).toBe('pesajes');
  });

  it('aguanta un nombre que no siga el patrón sin inventarse nada', () => {
    const e = Object.assign(new Error('x'), {
      cause: { constraint: { index: 'restriccion_rara' } },
    });
    expect(tablaQueBloquea(e)).toBe('restriccion_rara');
  });

  it('devuelve null cuando no hay de dónde sacarla', () => {
    expect(tablaQueBloquea(new Error('x'))).toBeNull();
  });
});

describe('nombreLegible', () => {
  it('traduce las tablas conocidas', () => {
    expect(nombreLegible('registros_mortalidad')).toBe('registros de mortalidad');
    expect(nombreLegible('consumos_diarios')).toBe('consumos diarios');
  });

  it('con una tabla desconocida al menos quita los guiones bajos', () => {
    expect(nombreLegible('tabla_nueva')).toBe('tabla nueva');
  });

  it('sin tabla devuelve null y el mensaje cae al genérico', () => {
    expect(nombreLegible(null)).toBeNull();
  });
});
