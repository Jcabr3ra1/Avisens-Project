import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ZonasGalponService } from './zonas-galpon.service';

describe('ZonasGalponService', () => {
  let service: ZonasGalponService;
  const prisma = {
    zonaGalpon: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZonasGalponService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ZonasGalponService>(ZonasGalponService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('crea una zona', async () => {
    prisma.zonaGalpon.create.mockResolvedValue({ id: 1, nombre: 'Zona norte' });
    const r = await service.crear({ galpon_id: 1, nombre: 'Zona norte' });
    expect(r.id).toBe(1);
  });

  it('lanza NotFound al obtener zona inexistente', async () => {
    prisma.zonaGalpon.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('elimina una zona existente', async () => {
    prisma.zonaGalpon.findUnique.mockResolvedValue({ id: 1 });
    prisma.zonaGalpon.delete.mockResolvedValue({ id: 1 });
    expect(await service.eliminar(1)).toEqual({ id: 1, eliminado: true });
  });
});
