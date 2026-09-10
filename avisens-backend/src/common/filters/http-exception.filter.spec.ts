import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
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
});
