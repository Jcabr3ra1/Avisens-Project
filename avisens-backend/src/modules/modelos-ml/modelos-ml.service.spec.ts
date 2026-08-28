import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelosMlService } from './modelos-ml.service';

describe('ModelosMlService', () => {
  let service: ModelosMlService;
  const prisma = {
    modeloMl: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelosMlService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ModelosMlService>(ModelosMlService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('crea un modelo', async () => {
    prisma.modeloMl.create.mockResolvedValue({ id: 1, nombre: 'test' });
    const r = await service.crear({ nombre: 'test' });
    expect(r.id).toBe(1);
  });

  it('lanza ConflictException si nombre+version duplicados', async () => {
    const err = Object.assign(new Error('dup'), { code: 'P2002' });
    prisma.modeloMl.create.mockRejectedValue(err);
    await expect(service.crear({ nombre: 'test', version: '1.0' })).rejects.toThrow(ConflictException);
  });

  it('lanza NotFound al obtener inexistente', async () => {
    prisma.modeloMl.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('elimina un modelo', async () => {
    prisma.modeloMl.findUnique.mockResolvedValue({ id: 1 });
    prisma.modeloMl.delete.mockResolvedValue({ id: 1 });
    expect(await service.eliminar(1)).toEqual({ id: 1, eliminado: true });
  });
});
