import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MensajesEquipoService } from './mensajes-equipo.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MensajesEquipoService', () => {
  let service: MensajesEquipoService;

  const prisma = {
    mensajeEquipo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    galpon: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const operario = { id: 9, rol: 'Operario', organizacion_id: 4 };
  const paginacion = { page: 1, limit: 20 };

  const argsDe = (mock: jest.Mock, llamada = 0): Record<string, any> => {
    const calls = mock.mock.calls as Array<[Record<string, any>]>;
    return calls[llamada][0];
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (operaciones: unknown) =>
        Array.isArray(operaciones)
          ? Promise.all(operaciones)
          : Promise.resolve(operaciones),
    );

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        MensajesEquipoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(MensajesEquipoService);
  });

  describe('enviar', () => {
    it('toma el emisor del token, no del cuerpo', async () => {
      prisma.mensajeEquipo.create.mockResolvedValue({ id: 1 });

      await service.enviar(
        { galpon_id: 3, contenido: 'revisar ventilador', emisor_id: 99 } as never,
        admin,
      );

      expect(argsDe(prisma.mensajeEquipo.create).data).toEqual({
        galpon_id: 3,
        emisor_id: admin.id,
        contenido: 'revisar ventilador',
      });
    });

    it('rechaza al operario sin asignación al galpón', async () => {
      prisma.galpon.findFirst.mockResolvedValue(null);

      await expect(
        service.enviar({ galpon_id: 3, contenido: 'hola' }, operario),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.mensajeEquipo.create).not.toHaveBeenCalled();
    });

    it('deja escribir al operario asignado', async () => {
      prisma.galpon.findFirst.mockResolvedValue({ id: 3 });
      prisma.mensajeEquipo.create.mockResolvedValue({ id: 7 });

      await service.enviar({ galpon_id: 3, contenido: 'listo' }, operario);

      expect(argsDe(prisma.galpon.findFirst).where).toMatchObject({
        id: 3,
        usuarios_galpones: {
          some: { usuario_id: operario.id, activa: true },
        },
      });
      expect(prisma.mensajeEquipo.create).toHaveBeenCalled();
    });
  });

  describe('listarDeGalpon', () => {
    it('filtra por galpón y ordena del más reciente al más antiguo', async () => {
      prisma.mensajeEquipo.findMany.mockResolvedValue([{ id: 2 }]);
      prisma.mensajeEquipo.count.mockResolvedValue(1);

      const resultado = await service.listarDeGalpon(3, admin, paginacion);

      const args = argsDe(prisma.mensajeEquipo.findMany);
      expect(args.where).toEqual({ galpon_id: 3 });
      expect(args.orderBy).toEqual({ fecha_envio: 'desc' });
      expect(resultado.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('con sin_leer sólo pide los que no tienen fecha_lectura', async () => {
      prisma.mensajeEquipo.findMany.mockResolvedValue([]);
      prisma.mensajeEquipo.count.mockResolvedValue(0);

      await service.listarDeGalpon(3, admin, { ...paginacion, sin_leer: true });

      expect(argsDe(prisma.mensajeEquipo.findMany).where).toEqual({
        galpon_id: 3,
        fecha_lectura: null,
      });
    });

    it('no lee la conversación de un galpón ajeno', async () => {
      prisma.galpon.findFirst.mockResolvedValue(null);

      await expect(
        service.listarDeGalpon(3, operario, paginacion),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.mensajeEquipo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('resumen', () => {
    it('cruza totales con sin leer y ordena por el último mensaje', async () => {
      const viejo = new Date('2026-08-20T10:00:00Z');
      const nuevo = new Date('2026-08-30T10:00:00Z');
      prisma.mensajeEquipo.groupBy
        .mockResolvedValueOnce([
          { galpon_id: 3, _count: { _all: 5 }, _max: { fecha_envio: viejo } },
          { galpon_id: 8, _count: { _all: 2 }, _max: { fecha_envio: nuevo } },
        ])
        .mockResolvedValueOnce([{ galpon_id: 8, _count: { _all: 2 } }]);
      prisma.galpon.findMany.mockResolvedValue([
        { id: 3, nombre: 'Galpón 3', codigo: 'G3' },
        { id: 8, nombre: 'Galpón 8', codigo: 'G8' },
      ]);

      const resultado = await service.resumen(admin);

      expect(resultado.map((r) => r.galpon_id)).toEqual([8, 3]);
      expect(resultado[0]).toMatchObject({ total: 2, sin_leer: 2 });
      expect(resultado[1]).toMatchObject({ total: 5, sin_leer: 0 });
    });

    it('limita el resumen del operario a sus galpones', async () => {
      prisma.mensajeEquipo.groupBy.mockResolvedValue([]);

      await service.resumen(operario);

      expect(argsDe(prisma.mensajeEquipo.groupBy).where).toMatchObject({
        galpon: {
          usuarios_galpones: {
            some: { usuario_id: operario.id, activa: true },
          },
        },
      });
    });

    it('el administrador consulta sin filtro de galpón', async () => {
      prisma.mensajeEquipo.groupBy.mockResolvedValue([]);

      await service.resumen(admin);

      expect(argsDe(prisma.mensajeEquipo.groupBy).where).toBeUndefined();
    });
  });

  describe('marcarLeidos', () => {
    it('no marca los mensajes propios', async () => {
      prisma.mensajeEquipo.updateMany.mockResolvedValue({ count: 4 });

      const resultado = await service.marcarLeidos(3, admin);

      expect(argsDe(prisma.mensajeEquipo.updateMany).where).toEqual({
        galpon_id: 3,
        fecha_lectura: null,
        emisor_id: { not: admin.id },
      });
      expect(resultado).toEqual({ galpon_id: 3, marcados: 4 });
    });

    it('rechaza marcar un galpón ajeno', async () => {
      prisma.galpon.findFirst.mockResolvedValue(null);

      await expect(service.marcarLeidos(3, operario)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.mensajeEquipo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra el mensaje propio', async () => {
      prisma.mensajeEquipo.findUnique.mockResolvedValue({
        id: 4,
        emisor_id: operario.id,
        galpon_id: 3,
      });

      const resultado = await service.eliminar(4, operario);

      expect(prisma.mensajeEquipo.delete).toHaveBeenCalledWith({
        where: { id: 4 },
      });
      expect(resultado).toEqual({ id: 4, eliminado: true });
    });

    it('el administrador tampoco borra mensajes de otro', async () => {
      prisma.mensajeEquipo.findUnique.mockResolvedValue({
        id: 4,
        emisor_id: 77,
        galpon_id: 3,
      });

      await expect(service.eliminar(4, admin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.mensajeEquipo.delete).not.toHaveBeenCalled();
    });

    it('404 si el mensaje no existe', async () => {
      prisma.mensajeEquipo.findUnique.mockResolvedValue(null);

      await expect(service.eliminar(4, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
