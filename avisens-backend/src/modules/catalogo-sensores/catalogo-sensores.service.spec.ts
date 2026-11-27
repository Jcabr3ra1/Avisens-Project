import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogoSensoresService } from './catalogo-sensores.service';

describe('CatalogoSensoresService', () => {
  const prisma = {
    catalogoSensor: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: CatalogoSensoresService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const modulo = await Test.createTestingModule({
      providers: [
        CatalogoSensoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = modulo.get(CatalogoSensoresService);
  });

  it('lista el catálogo paginado por tipo', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 1 }], 1]);

    const resultado = await service.listar({ page: 1, limit: 20 });

    expect(prisma.catalogoSensor.findMany).toHaveBeenCalledWith({
      orderBy: { tipo_sensor: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(resultado.meta.total).toBe(1);
  });

  it('rechaza un elemento inexistente', async () => {
    prisma.catalogoSensor.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('desactiva sin eliminar el precio histórico', async () => {
    prisma.catalogoSensor.findUnique.mockResolvedValue({ id: 1 });
    prisma.catalogoSensor.update.mockResolvedValue({ id: 1 });

    await expect(service.cambiarEstado(1, false)).resolves.toEqual({
      id: 1,
      activo: false,
    });
    expect(prisma.catalogoSensor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
  });
});
