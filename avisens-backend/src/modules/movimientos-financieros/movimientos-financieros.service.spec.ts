import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MovimientosFinancierosService } from './movimientos-financieros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

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
    granja: { findUnique: jest.fn() },
    categoriaFinanciera: { findUnique: jest.fn() },
    proveedor: { findUnique: jest.fn() },
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

  const movimientoExistente = {
    id: 1,
    granja_id: 10,
    lote_id: 1,
    granja: { id: 10, nombre: 'Granja Norte', propietario_id: 5 },
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
    prisma.proveedor.findUnique.mockResolvedValue({ id: 7 });
    prisma.granja.findUnique.mockResolvedValue({
      id: 10,
      propietario_id: 5,
    });
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      galpon: { granja: { id: 10, propietario_id: 5 } },
    });
    prisma.movimientoFinanciero.findUnique.mockResolvedValue(
      movimientoExistente,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('infiere la granja desde el lote', async () => {
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(
        expect.objectContaining({ granja_id: 10, lote_id: 1 }),
      );
    });

    it('permite un movimiento sin lote cuando se indica una granja propia', async () => {
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await service.crear(
        { ...dtoCrear, lote_id: undefined, granja_id: 10 },
        propietario,
      );

      expect(prisma.granja.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(expect.objectContaining({ granja_id: 10 }));
    });

    it('rechaza un movimiento sin lote ni granja', async () => {
      await expect(
        service.crear({ ...dtoCrear, lote_id: undefined }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('rechaza cuando lote y granja no coinciden', async () => {
      await expect(
        service.crear({ ...dtoCrear, granja_id: 99 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
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
        galpon: { granja: { id: 10, propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('valida el proveedor opcional antes de crear', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, proveedor_id: 7 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('filtra por las granjas del propietario', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.movimientoFinanciero.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { granja: { propietario_id: propietario.id } },
        }),
      );
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el movimiento no existe', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden aunque el movimiento ajeno no tenga lote', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        lote_id: null,
        granja: { id: 10, nombre: 'Ajena', propietario_id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('conserva la granja coherente con el lote existente', async () => {
      prisma.movimientoFinanciero.update.mockResolvedValue({ id: 1 });

      await service.actualizar(
        1,
        { descripcion: 'Factura ajustada' },
        propietario,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(expect.objectContaining({ granja_id: 10 }));
    });
  });

  describe('eliminar', () => {
    it('borra un movimiento de una granja propia', async () => {
      prisma.movimientoFinanciero.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1, propietario)).resolves.toEqual({
        id: 1,
        eliminado: true,
      });
    });
  });
});
