import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GalponesService } from './galpones.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GalponesService', () => {
  let service: GalponesService;

  const prisma = {
    galpon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    granja: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = { granja_id: 3, codigo: 'galpon1', nombre: 'Galpón Norte' };

  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalponesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<GalponesService>(GalponesService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    // Por defecto la granja 3 es del propietario 5.
    prisma.granja.findUnique.mockResolvedValue({ id: 3, propietario_id: 5 });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el galpón cuando la granja es del solicitante', async () => {
      prisma.galpon.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.galpon.create).toHaveBeenCalled();
    });

    it('un Propietario no puede crear en una granja ajena (403)', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 3,
        propietario_id: 999,
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.galpon.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.galpon.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve galpones de sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.galpon.findMany).granja).toEqual({
        propietario_id: 5,
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.galpon.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el galpón es del solicitante', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 5 },
      });
      prisma.galpon.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Nuevo nombre' }, propietario);

      expect(prisma.galpon.update).toHaveBeenCalled();
    });

    it('al mover a otra granja, re-valida que la nueva sea suya (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 5 },
      });
      prisma.granja.findUnique.mockResolvedValue({
        id: 9,
        propietario_id: 999,
      });

      await expect(
        service.actualizar(1, { granja_id: 9 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.galpon.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 5 },
      });
    });

    it('desactiva (borrado suave) cuando es dueño', async () => {
      prisma.galpon.update.mockResolvedValue({ id: 1 });

      const res = await service.desactivar(1, propietario);

      expect(res).toEqual({ id: 1, activo: false });
    });

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.galpon.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
