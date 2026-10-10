import { Prisma } from '@prisma/client';
import { clasificarFalloAlerta } from './clasificar-error';

/**
 * DriverAdapterError SIN `.cause` — la forma con la que este error de verdad
 * llegó a producción (ver `llave-foranea.spec.ts:errorCrudoSinClasificar`).
 * No se lee `.cause` aquí, pero sí hay que probar que el clasificador no se
 * cae ni pierde el bucket "base_de_datos" cuando no está.
 */
const driverAdapterErrorCrudo = () => {
  const e = new Error('violación en una tabla que no hace falta nombrar aquí');
  e.name = 'DriverAdapterError';
  return e;
};

const driverAdapterErrorConCause = () => {
  const e = new Error('lo mismo, pero con detalle anidado');
  e.name = 'DriverAdapterError';
  (e as Error & { cause: unknown }).cause = {
    kind: 'ForeignKeyConstraintViolation',
    originalCode: '23503',
  };
  return e;
};

describe('clasificarFalloAlerta', () => {
  it('un PrismaClientKnownRequestError da "base_de_datos" con su código', () => {
    const error = new Prisma.PrismaClientKnownRequestError('fallo', {
      code: 'P2002',
      clientVersion: '7.8.0',
    });
    expect(clasificarFalloAlerta(error)).toEqual({
      clasificacion: 'base_de_datos',
      codigo: 'P2002',
    });
  });

  it('un PrismaClientValidationError da "datos_invalidos", sin nada más', () => {
    const error = new Prisma.PrismaClientValidationError(
      'fallo con los argumentos completos de la consulta',
      { clientVersion: '7.8.0' },
    );
    const resultado = clasificarFalloAlerta(error);
    expect(resultado.clasificacion).toBe('datos_invalidos');
    expect(Object.keys(resultado)).toEqual(['clasificacion']);
  });

  it('un DriverAdapterError sin cause (el caso real de producción) da "base_de_datos" sin código', () => {
    expect(clasificarFalloAlerta(driverAdapterErrorCrudo())).toEqual({
      clasificacion: 'base_de_datos',
    });
  });

  it('un DriverAdapterError con cause también da "base_de_datos" sin código: aquí no se lee .cause', () => {
    expect(clasificarFalloAlerta(driverAdapterErrorConCause())).toEqual({
      clasificacion: 'base_de_datos',
    });
  });

  it('un error genérico da "desconocida" con el nombre de su clase', () => {
    expect(clasificarFalloAlerta(new Error('algo que no se esperaba'))).toEqual(
      {
        clasificacion: 'desconocida',
        codigo: 'Error',
      },
    );
  });

  it('un valor que no es un error da "desconocida", sin lanzar', () => {
    expect(clasificarFalloAlerta(null)).toEqual({
      clasificacion: 'desconocida',
      codigo: 'object',
    });
    expect(clasificarFalloAlerta(undefined)).toEqual({
      clasificacion: 'desconocida',
      codigo: 'undefined',
    });
    expect(clasificarFalloAlerta('texto')).toEqual({
      clasificacion: 'desconocida',
      codigo: 'string',
    });
  });

  it('nunca devuelve message, meta ni cause, aunque el error original los traiga', () => {
    const error = new Prisma.PrismaClientValidationError(
      'SELECT * FROM secretos WHERE password = ?',
      { clientVersion: '7.8.0' },
    );
    const resultado = clasificarFalloAlerta(error) as unknown as Record<
      string,
      unknown
    >;
    expect(resultado.message).toBeUndefined();
    expect(resultado.meta).toBeUndefined();
    expect(resultado.cause).toBeUndefined();
    expect(JSON.stringify(resultado)).not.toContain('secretos');
  });
});
