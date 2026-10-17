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
  // La lista blanca es deliberadamente estrecha: un solo codigo, dos claves
  // numericas fijas -- no "cualquier codigo con cualquier primitivo".
  describe('codigo de dominio y detalle acotado a horizonte_vencido', () => {
    it('reenvia codigo, dia_faena y ultimo_dia_observado cuando el codigo es horizonte_vencido', () => {
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

    it('no reenvia ningun otro campo, aunque venga junto al codigo permitido', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'horizonte_vencido',
          message: 'x',
          token: 'secreto',
          detalleAnidado: { secreto: 'no deberia salir' },
        }),
        host(),
      );

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBe('horizonte_vencido');
      expect(cuerpo.token).toBeUndefined();
      expect(cuerpo.detalleAnidado).toBeUndefined();
    });

    it('no reenvia nada extra cuando el codigo no es horizonte_vencido', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'otro_codigo',
          message: 'x',
          dia_faena: 42,
        }),
        host(),
      );

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBeUndefined();
      expect(cuerpo.dia_faena).toBeUndefined();
    });

    it('no agrega ningun campo extra cuando la excepcion no declara codigo', () => {
      filtro.catch(new NotFoundException('Lote no encontrado'), host());

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBeUndefined();
    });
  });

  describe('sin_plan_utilizable y plan_desactualizado', () => {
    it('reenvia codigo y estado_plan cuando es uno de los 4 valores permitidos', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'sin_plan_utilizable',
          message: 'El lote no tiene un plan con día objetivo calculado',
          estado_plan: 'sin_curva',
        }),
        host(),
      );

      expect(status).toHaveBeenCalledWith(422);
      expect(respuesta()).toMatchObject({
        codigo: 'sin_plan_utilizable',
        estado_plan: 'sin_curva',
      });
    });

    it('no reenvia estado_plan si su valor no esta en la lista blanca de 4', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'sin_plan_utilizable',
          message: 'x',
          estado_plan: 'calculado', // no es uno de los 4 estados "sin plan"
        }),
        host(),
      );

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBe('sin_plan_utilizable');
      expect(cuerpo.estado_plan).toBeUndefined();
    });

    it('plan_desactualizado no reenvia ningun campo extra, ni siquiera estado_plan', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'plan_desactualizado',
          message: 'x',
          estado_plan: 'sin_plan',
        }),
        host(),
      );

      const cuerpo = respuesta();
      expect(cuerpo.codigo).toBe('plan_desactualizado');
      expect(cuerpo.estado_plan).toBeUndefined();
    });

    it('plan_excede_limites_ml reenvia dia_faena y peso_objetivo_g, ambos numericos', () => {
      filtro.catch(
        new UnprocessableEntityException({
          codigo: 'plan_excede_limites_ml',
          message: 'x',
          dia_faena: 120,
          peso_objetivo_g: 15000,
        }),
        host(),
      );

      expect(respuesta()).toMatchObject({
        codigo: 'plan_excede_limites_ml',
        dia_faena: 120,
        peso_objetivo_g: 15000,
      });
    });
  });
});
