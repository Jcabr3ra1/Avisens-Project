import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CurvasObjetivoService } from './curvas-objetivo.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CurvasObjetivoService', () => {
  let service: CurvasObjetivoService;

  const prisma = {
    curvaObjetivo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurvasObjetivoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CurvasObjetivoService>(CurvasObjetivoService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea cuando la combinacion sexo+dia no existe', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(null);
      prisma.curvaObjetivo.create.mockResolvedValue({ id: 1 });
      await service.crear({ sexo: 'macho', dia: 21, peso_esperado_g: 1035 });
      expect(prisma.curvaObjetivo.create).toHaveBeenCalled();
    });

    it('lanza Conflict cuando ya existe sexo+dia', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 9,
        sexo: 'macho',
        dia: 21,
      });
      await expect(service.crear({ sexo: 'macho', dia: 21 })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.curvaObjetivo.create).not.toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el punto no existe', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza el mismo punto sin verificar unica', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 1,
        sexo: 'macho',
        dia: 21,
      });
      prisma.curvaObjetivo.update.mockResolvedValue({ id: 1 });
      await service.actualizar(1, { peso_esperado_g: 1040 });
      expect(prisma.curvaObjetivo.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.curvaObjetivo.update).toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra fisicamente el punto', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 1,
        sexo: 'macho',
        dia: 21,
      });
      prisma.curvaObjetivo.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1);
      expect(prisma.curvaObjetivo.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
