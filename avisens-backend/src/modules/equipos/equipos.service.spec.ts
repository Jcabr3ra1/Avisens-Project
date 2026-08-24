import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { EquiposService } from './equipos.service';

describe('EquiposService', () => {
  let service: EquiposService;

  const prisma = {
    equipo: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<EquiposService>(EquiposService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('crea un equipo con es_actuador por defecto false', async () => {
      prisma.equipo.create.mockResolvedValue({ id: 1, es_actuador: false });
      const r = await service.crear({ galpon_id: 1, codigo: 'EQ-01', nombre: 'Ventilador' });
      expect(r.id).toBe(1);
    });

    it('lanza ConflictException si el codigo ya existe', async () => {
      const err = Object.assign(new Error('dup'), { code: 'P2002' });
      prisma.equipo.create.mockRejectedValue(err);
      await expect(
        service.crear({ galpon_id: 1, codigo: 'EQ-01', nombre: 'Ventilador' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminar', () => {
    it('elimina un equipo existente', async () => {
      prisma.equipo.findUnique.mockResolvedValue({ id: 1 });
      prisma.equipo.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1);
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
