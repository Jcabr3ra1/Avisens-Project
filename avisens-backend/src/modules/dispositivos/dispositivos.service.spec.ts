import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DispositivosService } from './dispositivos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken } from '../../common/security/device-token';

describe('DispositivosService', () => {
  let service: DispositivosService;

  const prisma = {
    dispositivo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sensor: { deleteMany: jest.fn(), updateMany: jest.fn() },
    galpon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 3,
    codigo_topic: 'galpon1',
    nombre: 'Nodo entrada norte',
  };

  const dataDe = (mock: jest.Mock, indice = 0): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[indice][0].data;
  };
  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispositivosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<DispositivosService>(DispositivosService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.dispositivo.create.mockReset();
    prisma.dispositivo.findMany.mockResolvedValue([]);
    // Por defecto el galpón 3 es del propietario 5.
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
      codigo: 'GAL-000003',
      granja: { propietario_id: 5 },
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el dispositivo y genera un token de ingesta', async () => {
      prisma.dispositivo.create.mockResolvedValue({ id: 1 });

      const res = await service.crear(dtoCrear, propietario);

      expect(prisma.dispositivo.create).toHaveBeenCalled();
      expect(typeof res.token_ingesta).toBe('string');
      expect(res.token_ingesta.length).toBeGreaterThan(0);
      // Solo se persiste el hash; el secreto se revela una única vez.
      expect(dataDe(prisma.dispositivo.create).token_ingesta).toBeUndefined();
      expect(dataDe(prisma.dispositivo.create).token_ingesta_hash).toBe(
        hashDeviceToken(res.token_ingesta),
      );
    });

    it('un Propietario no puede crear en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 3,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.dispositivo.create).not.toHaveBeenCalled();
    });

    it('genera el código y el nombre desde el galpón sin pedir identidad manual', async () => {
      prisma.dispositivo.create.mockResolvedValue({ id: 1 });

      await service.crear({ galpon_id: 3 }, admin);

      expect(dataDe(prisma.dispositivo.create)).toMatchObject({
        galpon_id: 3,
        codigo_topic: 'GAL-000003-ESP32-001',
        nombre: 'GAL-000003-ESP32-001',
      });
    });

    it('avanza después del último consecutivo del galpón', async () => {
      prisma.dispositivo.findMany.mockResolvedValue([
        { galpon_id: 3, codigo_topic: 'GAL-000003-ESP32-001' },
        { galpon_id: 3, codigo_topic: 'GAL-000003-ESP32-003' },
      ]);
      prisma.dispositivo.create.mockResolvedValue({ id: 4 });

      await service.crear({ galpon_id: 3 }, admin);

      expect(dataDe(prisma.dispositivo.create).codigo_topic).toBe(
        'GAL-000003-ESP32-004',
      );
    });

    it('salta un código ocupado por un galpón histórico con el mismo prefijo', async () => {
      prisma.dispositivo.findMany.mockResolvedValue([
        { galpon_id: 99, codigo_topic: 'GAL-000003-ESP32-001' },
      ]);
      prisma.dispositivo.create.mockResolvedValue({ id: 2 });

      await service.crear({ galpon_id: 3 }, admin);

      expect(dataDe(prisma.dispositivo.create).codigo_topic).toBe(
        'GAL-000003-ESP32-002',
      );
    });

    it('reintenta con el siguiente número si otro registro reserva el mismo código', async () => {
      prisma.dispositivo.create
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Código ocupado', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['codigo_topic'] },
          }),
        )
        .mockResolvedValueOnce({ id: 2 });

      await service.crear({ galpon_id: 3 }, admin);

      expect(prisma.dispositivo.create).toHaveBeenCalledTimes(2);
      expect(dataDe(prisma.dispositivo.create, 1).codigo_topic).toBe(
        'GAL-000003-ESP32-002',
      );
    });

    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.dispositivo.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve dispositivos de sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.dispositivo.findMany).galpon).toEqual({
        granja: { propietario_id: 5 },
      });
      expect(whereDe(prisma.dispositivo.findMany).retirado_en).toBeNull();
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.dispositivo.findMany)).toEqual({
        retirado_en: null,
      });
    });
  });

  describe('regenerarToken', () => {
    it('genera y revela un token nuevo', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.dispositivo.update.mockResolvedValue({});

      const res = await service.regenerarToken(1, propietario);

      expect(typeof res.token_ingesta).toBe('string');
      expect(res.token_ingesta.length).toBeGreaterThan(0);
      expect(prisma.dispositivo.update).toHaveBeenCalled();
      expect(dataDe(prisma.dispositivo.update).token_ingesta).toBeNull();
      expect(dataDe(prisma.dispositivo.update).token_ingesta_hash).toBe(
        hashDeviceToken(res.token_ingesta),
      );
    });

    it('un Propietario no puede regenerar el token de un dispositivo ajeno (403)', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.regenerarToken(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.dispositivo.update).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el dispositivo es del solicitante', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 5 } },
      });
      prisma.dispositivo.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Nuevo' }, propietario);

      expect(prisma.dispositivo.update).toHaveBeenCalled();
    });

    it('impide trasladar un dispositivo con historial a otro galpón', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });

      await expect(
        service.actualizar(1, { galpon_id: 9 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.dispositivo.update).not.toHaveBeenCalled();
    });
  });

  describe('activar / desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('desactiva (borrado suave) cuando es dueño', async () => {
      prisma.dispositivo.update.mockResolvedValue({ id: 1 });

      const res = await service.desactivar(1, propietario);

      expect(res).toEqual({ id: 1, activo: false });
    });

    it('activa cuando es dueño', async () => {
      prisma.dispositivo.update.mockResolvedValue({ id: 1 });

      const res = await service.activar(1, propietario);

      expect(res).toEqual({ id: 1, activo: true });
    });

    it('sin historial borra el controlador y los sensores que nunca midieron', async () => {
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.dispositivo.findFirst.mockResolvedValue(null);

      const res = await service.eliminarPermanente(1, propietario);

      expect(prisma.sensor.deleteMany).toHaveBeenCalledWith({
        where: {
          dispositivo_id: 1,
          estado: { not: 'retirado' },
          mediciones: { none: {} },
          alertas: { none: {} },
        },
      });
      expect(prisma.dispositivo.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res).toEqual({ id: 1, eliminado: true, retirado: false });
    });

    it('con historial retira sensores y controlador, y revoca su token', async () => {
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.dispositivo.findFirst.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(prisma.sensor.updateMany).toHaveBeenCalledWith({
        where: { dispositivo_id: 1, estado: { not: 'retirado' } },
        data: { estado: 'retirado', canal: null },
      });
      expect(prisma.dispositivo.delete).not.toHaveBeenCalled();
      const [{ where, data }] = prisma.dispositivo.update.mock.calls[0] as [
        { where: { id: number }; data: Record<string, unknown> },
      ];
      expect(where).toEqual({ id: 1 });
      expect(data).toMatchObject({
        activo: false,
        token_ingesta: null,
        token_ingesta_hash: null,
      });
      expect(data.retirado_en).toBeInstanceOf(Date);
      expect(res).toEqual({ id: 1, eliminado: false, retirado: true });
    });

    it('un controlador retirado no se activa, edita ni regenera token', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({
        id: 1,
        retirado_en: new Date(),
        galpon: { granja: { propietario_id: 5 } },
      });

      await expect(service.activar(1, propietario)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(
        service.regenerarToken(1, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.eliminarPermanente(1, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.dispositivo.update).not.toHaveBeenCalled();
    });
  });

  describe('conectividad', () => {
    const ahora = new Date('2026-10-17T12:00:00Z');
    const fila = (id: number, minutos: number | null) => ({
      id,
      nombre: `ESP-${id}`,
      codigo_topic: `t${id}`,
      ultima_conexion:
        minutos === null ? null : new Date(ahora.getTime() - minutos * 60_000),
      galpon: {
        id: 1,
        nombre: 'G1',
        granja: {
          id: 1,
          nombre: 'Finca',
          organizacion: { id: 1, nombre: 'Org' },
        },
      },
    });

    it('solo considera dispositivos activos y cuenta cada estado', async () => {
      prisma.dispositivo.findMany.mockResolvedValue([
        fila(1, null),
        fila(2, 40),
        fila(3, 2),
      ]);

      const res = await service.conectividad(ahora);

      expect(prisma.dispositivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } }),
      );
      expect(res).toEqual(
        expect.objectContaining({
          ventana_minutos: 15,
          total: 3,
          conectados: 1,
          sin_reportar: 1,
          nunca: 1,
        }),
      );
      expect(res.problemas.map((d) => [d.id, d.estado])).toEqual([
        [1, 'nunca'],
        [2, 'sin_reportar'],
      ]);
    });
  });
});
