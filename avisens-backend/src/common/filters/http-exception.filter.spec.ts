import {
  ArgumentsHost,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filtro: HttpExceptionFilter;
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  const host = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ status, getHeader: () => 'req-123' }),
        getRequest: () => ({ method: 'DELETE', url: '/v1/lotes/39/permanente' }),
      }),
    }) as unknown as ArgumentsHost;

  const respuesta = (): Record<string, unknown> =>
    (json.mock.calls as Array<[Record<string, unknown>]>)[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    filtro = new HttpExceptionFilter();
  });

  afterEach(() => jest.restoreAllMocks());

  // Este es el fallo que llegó a producción: borrar un lote con registros de
  // mortalidad devolvía 500 y el usuario no veía nada.
  describe('violación de llave foránea desde el driver', () => {
    const errorDelDriver = () => {
      const e = new Error(
        'update or delete on table "lotes" violates RESTRICT setting of foreign ' +
          'key constraint "registros_mortalidad_lote_id_fkey"',
      );
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = {
        kind: 'ForeignKeyConstraintViolation',
        originalCode: '23503',
        constraint: { index: 'registros_mortalidad_lote_id_fkey' },
      };
      return e;
    };

    it('responde 409 y no 500', () => {
      filtro.catch(errorDelDriver(), host());

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(status).not.toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    // La forma con la que de verdad llegó: sin `cause` que la clasifique, sólo
    // el mensaje de Postgres. Por eso el primer arreglo no la atrapó.
    const errorCrudo = () => {
      const e = new Error(
        'update or delete on table "lotes" violates RESTRICT setting of foreign ' +
          'key constraint "registros_mortalidad_lote_id_fkey" on table "registros_mortalidad"',
      );
      e.name = 'DriverAdapterError';
      return e;
    };

    it('responde 409 aunque el error no traiga cause', () => {
      filtro.catch(errorCrudo(), host());

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(respuesta().message).toContain('registros de mortalidad');
    });

    it('dice qué lo bloquea, para que el mensaje sirva de algo', () => {
      filtro.catch(errorDelDriver(), host());

      expect(respuesta().message).toContain('registros de mortalidad');
      expect(respuesta().message).toContain('Desactívalo');
    });

    it('conserva ruta y requestId, como el resto de errores', () => {
      filtro.catch(errorDelDriver(), host());

      expect(respuesta().path).toBe('/v1/lotes/39/permanente');
      expect(respuesta().requestId).toBe('req-123');
    });

    it('sin nombre de restricción cae a un mensaje genérico, no revienta', () => {
      const e = new Error('fk');
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = { originalCode: '23503' };

      filtro.catch(e, host());

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(respuesta().message).toContain('dependen de este');
    });
  });

  it('una excepción HTTP normal sigue pasando tal cual', () => {
    filtro.catch(new NotFoundException('Lote no encontrado'), host());

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(respuesta().message).toBe('Lote no encontrado');
  });

  it('un fallo de verdad sigue siendo 500', () => {
    filtro.catch(new Error('se cayó la conexión'), host());

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  // El filtro reconstruye la respuesta desde cero (statusCode, message,
  // timestamp, path, requestId): sin este bloque, cualquier campo propio del
  // cuerpo de la excepcion (codigo, dia_faena, etc.) se perdia en silencio.
  describe('codigo de dominio y detalle acotado', () => {
    it('reenvia codigo y los campos primitivos cuando la excepcion lo declara', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'horizonte_vencido',
          message: 'El lote ya superó el día de proyección',
          dia_faena: 42,
          ultimo_dia_observado: 43,
        }),
        host(),
      );

      expect(status).toHaveBeenCalledWith(422);
      expect(respuesta()).toMatchObject({
        codigo: 'horizonte_vencido',
        message: 'El lote ya superó el día de proyección',
        dia_faena: 42,
        ultimo_dia_observado: 43,
      });
    });

    it('descarta valores no primitivos del cuerpo, aunque haya codigo', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'horizonte_vencido',
          message: 'x',
          detalleAnidado: { secreto: 'no deberia salir' },
          lista: [1, 2, 3],
        }),
        host(),
      );

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBe('horizonte_vencido');
      expect(cuerpo.detalleAnidado).toBeUndefined();
      expect(cuerpo.lista).toBeUndefined();
    });

    it('no agrega ningun campo extra cuando la excepcion no declara codigo', () => {
      filtro.catch(new NotFoundException('Lote no encontrado'), host());

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBeUndefined();
      expect(Object.keys(cuerpo)).not.toEqual(
        expect.arrayContaining(['dia_faena', 'ultimo_dia_observado']),
      );
    });
  });
});
