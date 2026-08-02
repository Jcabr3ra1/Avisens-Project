import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InsumosService', () => {
  let service: InsumosService;

  const prisma = {
    inventarioInsumo: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    proveedor: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const dtoCrear = { nombre: 'Alimento iniciación', unidad_medida: 'kg' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InsumosService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<InsumosService>(InsumosService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea sin consultar proveedor cuando no se indica uno habitual', async () => {
      prisma.inventarioInsumo.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear);

      expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
      expect(prisma.inventarioInsumo.create).toHaveBeenCalled();
    });

    it('rechaza (404) si el proveedor habitual indicado no existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, proveedor_habitual_id: 7 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.inventarioInsumo.create).not.toHaveBeenCalled();
    });

    it('crea cuando el proveedor habitual indicado existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue({ id: 7 });
      prisma.inventarioInsumo.create.mockResolvedValue({ id: 1 });

      await service.crear({ ...dtoCrear, proveedor_habitual_id: 7 });

      expect(prisma.inventarioInsumo.create).toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('rechaza (404) si el insumo no existe (no muta)', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(null);

      await expect(service.actualizar(99, { nombre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el nuevo proveedor habitual no existe (no muta)', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue({ id: 1 });
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(1, { proveedor_habitual_id: 7 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
    });
  });
});
