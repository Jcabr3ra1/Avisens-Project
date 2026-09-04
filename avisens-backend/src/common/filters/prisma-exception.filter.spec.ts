import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  const hostCon = (method: string): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method, url: '/v1/granjas/1/permanente' }),
      }),
    }) as unknown as ArgumentsHost;

  const errorPrisma = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('fallo', {
      code,
      clientVersion: '7.0.0',
    });

  const respuesta = (): Record<string, unknown> =>
    (json.mock.calls as Array<[Record<string, unknown>]>)[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new PrismaExceptionFilter();
  });

  describe('P2003: llave foránea', () => {
    it('al borrar dice que hay hijos que dependen, con 409', () => {
      filter.catch(errorPrisma('P2003'), hostCon('DELETE'));

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(respuesta().message).toBe(
        'No se puede eliminar: todavía hay registros que dependen de este',
      );
    });

    it('al crear dice que el padre no existe, con 400', () => {
      filter.catch(errorPrisma('P2003'), hostCon('POST'));

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(respuesta().message).toBe(
        'Referencia inválida: el registro relacionado no existe',
      );
    });

    it('al actualizar se comporta como al crear', () => {
      filter.catch(errorPrisma('P2003'), hostCon('PATCH'));

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    // Lo que hacía mal el filtro antes: usar el mensaje de "el padre no existe"
    // para un borrado, que describe la situación contraria a la que ocurrió.
    it('el mensaje de borrado nunca dice que algo no existe', () => {
      filter.catch(errorPrisma('P2003'), hostCon('DELETE'));

      expect(respuesta().message).not.toContain('no existe');
    });
  });

  describe('otros códigos', () => {
    it('P2025 sigue siendo 404 aunque sea un DELETE', () => {
      filter.catch(errorPrisma('P2025'), hostCon('DELETE'));

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(respuesta().message).toBe('Registro no encontrado');
    });

    it('P2002 sigue siendo 409 de duplicado', () => {
      const error = new Prisma.PrismaClientKnownRequestError('fallo', {
        code: 'P2002',
        clientVersion: '7.0.0',
        meta: { target: ['email'] },
      });

      filter.catch(error, hostCon('POST'));

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(respuesta().message).toBe(
        'Ya existe un registro con ese valor en: email',
      );
    });
  });
});
