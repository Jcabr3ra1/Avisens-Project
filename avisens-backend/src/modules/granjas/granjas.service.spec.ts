import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GranjasService } from './granjas.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GranjasService', () => {
  let service: GranjasService;

  const prisma = {
    granja: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    usuario: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

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
      providers: [GranjasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<GranjasService>(GranjasService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('un Propietario crea la granja a su propio nombre', async () => {
      prisma.granja.create.mockResolvedValue({ id: 1 });

      await service.crear({ nombre: 'La Esperanza' }, propietario);

      expect(dataDe(prisma.granja.create).propietario_id).toBe(5);
    });

    it('un Admin sin propietario_id recibe 400', async () => {
      await expect(service.crear({ nombre: 'X' }, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.granja.create).not.toHaveBeenCalled();
    });

    it('un Admin con un propietario inexistente recibe 404', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ nombre: 'X', propietario_id: 99 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.granja.create).not.toHaveBeenCalled();
    });

    it('un Admin crea la granja para el propietario indicado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 7 });
      prisma.granja.create.mockResolvedValue({ id: 1 });

      await service.crear({ nombre: 'X', propietario_id: 7 }, admin);

      expect(dataDe(prisma.granja.create).propietario_id).toBe(7);
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.granja.findMany)).toEqual({ propietario_id: 5 });
    });

    it('un Admin ve todas las granjas', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.granja.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver una granja ajena (403)', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario: { id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
