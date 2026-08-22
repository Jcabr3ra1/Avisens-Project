import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MovimientosFinancierosService } from './movimientos-financieros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

describe('MovimientosFinancierosService', () => {
  let service: MovimientosFinancierosService;

  const prisma = {
    movimientoFinanciero: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    categoriaFinanciera: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const dtoCrear = {
    categoria_id: 3,
    tipo: 'egreso',
    valor_cop: 1500000,
    fecha: '2026-08-18',
    lote_id: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosFinancierosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<MovimientosFinancierosService>(
      MovimientosFinancierosService,
    );
    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.categoriaFinanciera.findUnique.mockResolvedValue({ id: 3 });
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      galpon: { granja: { propietario_id: 5 } },
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el movimiento cuando la categoria y el lote son validos', async () => {
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });
      await service.crear(dtoCrear, propietario);
      expect(prisma.movimientoFinanciero.create).toHaveBeenCalled();
    });

    it('lanza NotFound si la categoria no existe', async () => {
      prisma.categoriaFinanciera.findUnique.mockResolvedValue(null);
      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('lanza Forbidden si el lote no es del propietario', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });
      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el movimiento no existe', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden si el movimiento es de un lote ajeno', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });
      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('eliminar', () => {
    it('borra el movimiento del propietario', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.movimientoFinanciero.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1, propietario);
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
