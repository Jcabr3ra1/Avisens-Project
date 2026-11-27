import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LineasGeneticasService } from './lineas-geneticas.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LineasGeneticasService', () => {
  let service: LineasGeneticasService;

  const prisma = {
    lineaGenetica: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineasGeneticasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LineasGeneticasService>(LineasGeneticasService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('normaliza el codigo a minusculas antes de guardar', async () => {
      prisma.lineaGenetica.create.mockResolvedValue({ id: 1 });

      await service.crear({ codigo: 'Ross_308', nombre: 'Ross 308' });

      expect(prisma.lineaGenetica.create).toHaveBeenCalledWith({
        data: {
          codigo: 'ross_308',
          nombre: 'Ross 308',
          descripcion: undefined,
        },
      });
    });

    it('traduce un choque de codigo unico (P2002) a un 409 de dominio', async () => {
      prisma.lineaGenetica.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.crear({ codigo: 'ross_308', nombre: 'Ross 308' }),
      ).rejects.toThrow(ConflictException);
    });

    it('propaga cualquier otro error sin traducirlo', async () => {
      prisma.lineaGenetica.create.mockRejectedValue(new Error('otro fallo'));

      await expect(
        service.crear({ codigo: 'ross_308', nombre: 'Ross 308' }),
      ).rejects.toThrow('otro fallo');
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('solo pasa nombre y descripcion (codigo no forma parte del DTO)', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue({ id: 1 });
      prisma.lineaGenetica.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Ross 308 actualizado' });

      expect(prisma.lineaGenetica.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nombre: 'Ross 308 actualizado' },
      });
    });
  });

  describe('cambiarEstado', () => {
    it('activa', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue({ id: 1 });
      prisma.lineaGenetica.update.mockResolvedValue({});

      const res = await service.cambiarEstado(1, true);

      expect(prisma.lineaGenetica.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { activo: true },
      });
      expect(res).toEqual({ id: 1, activo: true });
    });

    it('rechaza (404) si la linea no existe', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue(null);

      await expect(service.cambiarEstado(1, false)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lineaGenetica.update).not.toHaveBeenCalled();
    });
  });
});
