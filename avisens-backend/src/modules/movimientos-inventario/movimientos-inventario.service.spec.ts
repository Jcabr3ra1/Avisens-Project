import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MovimientosInventarioService } from './movimientos-inventario.service';

describe('MovimientosInventarioService', () => {
  let service: MovimientosInventarioService;
  const prisma = {
    movimientoInventario: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovimientosInventarioService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<MovimientosInventarioService>(MovimientosInventarioService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('crea un movimiento', async () => {
    prisma.movimientoInventario.create.mockResolvedValue({ id: 1 });
    const r = await service.crear({ insumo_id: 1, tipo_movimiento: 'entrada', cantidad: 50 });
    expect(r.id).toBe(1);
  });

  it('lanza NotFound al obtener inexistente', async () => {
    prisma.movimientoInventario.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('elimina un movimiento', async () => {
    prisma.movimientoInventario.findUnique.mockResolvedValue({ id: 1 });
    prisma.movimientoInventario.delete.mockResolvedValue({ id: 1 });
    expect(await service.eliminar(1)).toEqual({ id: 1, eliminado: true });
  });
});
