import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    galpon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 3,
    mac_address: 'A4:CF:12:8B:00:1A',
    codigo_topic: 'galpon1',
    nombre: 'Nodo entrada norte',
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
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
    // Por defecto el galpón 3 es del propietario 5.
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
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
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.dispositivo.findMany)).toBeUndefined();
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

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.dispositivo.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
