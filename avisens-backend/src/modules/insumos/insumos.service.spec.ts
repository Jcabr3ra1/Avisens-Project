import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { InsumosService } from './insumos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';

const ADMIN = { id: 1, rol: ROLES.ADMINISTRADOR };
const DUENO = { id: 7, rol: ROLES.PROPIETARIO };
const OTRO_DUENO = { id: 8, rol: ROLES.PROPIETARIO };

const insumoDe = (propietarioId: number, stock = '100') => ({
  id: 1,
  granja_id: 2,
  unidad_medida: 'kg',
  stock_actual: new Prisma.Decimal(stock),
  granja: { id: 2, nombre: 'La Esperanza', propietario_id: propietarioId },
});

describe('InsumosService', () => {
  let service: InsumosService;

  const tx = {
    inventarioInsumo: { create: jest.fn(), update: jest.fn() },
    movimientoInventario: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const prisma = {
    inventarioInsumo: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    movimientoInventario: { findMany: jest.fn(), count: jest.fn() },
    proveedor: { findUnique: jest.fn() },
    granja: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const dtoCrear = {
    granja_id: 2,
    nombre: 'Alimento iniciación',
    unidad_medida: 'kg',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [InsumosService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<InsumosService>(InsumosService);

    prisma.granja.findUnique.mockResolvedValue({ propietario_id: DUENO.id });
    // Por defecto $transaction se comporta como el array de listar; los tests
    // que necesitan la forma de callback la sobrescriben.
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  const conCallback = () => {
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
  };

  describe('crear', () => {
    it('crea sin consultar proveedor cuando no se indica uno habitual', async () => {
      conCallback();
      tx.inventarioInsumo.create.mockResolvedValue({
        id: 1,
        unidad_medida: 'kg',
        stock_actual: new Prisma.Decimal(0),
      });

      await service.crear(dtoCrear, ADMIN);

      expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
      expect(tx.inventarioInsumo.create).toHaveBeenCalled();
    });

    it('rechaza (404) si el proveedor habitual indicado no existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, proveedor_habitual_id: 7 }, ADMIN),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza (404) si la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('impide al propietario crear insumos en granjas ajenas', async () => {
      await expect(service.crear(dtoCrear, OTRO_DUENO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deja rastro del stock inicial como movimiento de entrada', async () => {
      conCallback();
      tx.inventarioInsumo.create.mockResolvedValue({
        id: 1,
        unidad_medida: 'kg',
        stock_actual: new Prisma.Decimal(100),
      });

      await service.crear({ ...dtoCrear, stock_actual: 100 }, ADMIN);

      const [args] = tx.movimientoInventario.create.mock.calls[0] as [
        {
          data: {
            tipo_movimiento: TipoMovimientoInventario;
            motivo: string;
            usuario_id: number;
          };
        },
      ];
      expect(args.data.tipo_movimiento).toBe(TipoMovimientoInventario.entrada);
      expect(args.data.motivo).toBe('Stock inicial');
      expect(args.data.usuario_id).toBe(ADMIN.id);
    });

    it('no registra movimiento cuando el stock inicial es cero', async () => {
      conCallback();
      tx.inventarioInsumo.create.mockResolvedValue({
        id: 1,
        unidad_medida: 'kg',
        stock_actual: new Prisma.Decimal(0),
      });

      await service.crear(dtoCrear, ADMIN);

      expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('el administrador ve todos los insumos', async () => {
      await service.listar(ADMIN, { page: 1, limit: 10 });
      expect(prisma.inventarioInsumo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('el propietario solo ve los de sus granjas', async () => {
      await service.listar(DUENO, { page: 1, limit: 10 });
      expect(prisma.inventarioInsumo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { granja: { propietario_id: DUENO.id } },
        }),
      );
      expect(prisma.inventarioInsumo.count).toHaveBeenCalledWith({
        where: { granja: { propietario_id: DUENO.id } },
      });
    });
  });

  describe('obtener', () => {
    it('impide al propietario ver un insumo de otra granja', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));
      await expect(service.obtener(1, OTRO_DUENO)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('rechaza (404) si el insumo no existe (no muta)', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(99, { nombre: 'X' }, ADMIN),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el nuevo proveedor habitual no existe (no muta)', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(1, { proveedor_habitual_id: 7 }, ADMIN),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
    });

    it('nunca escribe stock_actual: el stock solo se mueve con movimientos', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));
      prisma.inventarioInsumo.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Nuevo' }, ADMIN);

      const [args] = prisma.inventarioInsumo.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).not.toHaveProperty('stock_actual');
    });
  });

  describe('registrarMovimiento', () => {
    const prepararStock = (stock: string) => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(
        insumoDe(DUENO.id, stock),
      );
      conCallback();
      tx.$queryRaw.mockResolvedValue([
        { stock_actual: new Prisma.Decimal(stock) },
      ]);
      tx.movimientoInventario.create.mockImplementation(
        (a: { data: unknown }) => a.data,
      );
    };

    it('una entrada suma al stock', async () => {
      prepararStock('100');

      await service.registrarMovimiento(
        1,
        { tipo_movimiento: TipoMovimientoInventario.entrada, cantidad: 25.5 },
        ADMIN,
      );

      const [args] = tx.inventarioInsumo.update.mock.calls[0] as [
        { data: { stock_actual: Prisma.Decimal } },
      ];
      expect(args.data.stock_actual.toString()).toBe('125.5');
    });

    it('una salida resta del stock', async () => {
      prepararStock('100');

      await service.registrarMovimiento(
        1,
        { tipo_movimiento: TipoMovimientoInventario.salida, cantidad: 30 },
        ADMIN,
      );

      const [args] = tx.inventarioInsumo.update.mock.calls[0] as [
        { data: { stock_actual: Prisma.Decimal } },
      ];
      expect(args.data.stock_actual.toString()).toBe('70');
    });

    it('un ajuste fija el stock al valor contado, no lo suma', async () => {
      prepararStock('100');

      await service.registrarMovimiento(
        1,
        { tipo_movimiento: TipoMovimientoInventario.ajuste, cantidad: 80 },
        ADMIN,
      );

      const [args] = tx.inventarioInsumo.update.mock.calls[0] as [
        { data: { stock_actual: Prisma.Decimal } },
      ];
      expect(args.data.stock_actual.toString()).toBe('80');
    });

    it('rechaza una salida que dejaria el stock en negativo', async () => {
      prepararStock('10');

      await expect(
        service.registrarMovimiento(
          1,
          { tipo_movimiento: TipoMovimientoInventario.salida, cantidad: 50 },
          ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.inventarioInsumo.update).not.toHaveBeenCalled();
    });

    it('guarda el stock resultante junto al movimiento', async () => {
      prepararStock('100');

      await service.registrarMovimiento(
        1,
        { tipo_movimiento: TipoMovimientoInventario.entrada, cantidad: 10 },
        ADMIN,
      );

      const [args] = tx.movimientoInventario.create.mock.calls[0] as [
        { data: { stock_resultante: Prisma.Decimal; usuario_id: number } },
      ];
      expect(args.data.stock_resultante.toString()).toBe('110');
      expect(args.data.usuario_id).toBe(ADMIN.id);
    });

    it('bloquea la fila antes de calcular, para no perder movimientos simultaneos', async () => {
      prepararStock('100');

      await service.registrarMovimiento(
        1,
        { tipo_movimiento: TipoMovimientoInventario.entrada, cantidad: 10 },
        ADMIN,
      );

      expect(tx.$queryRaw).toHaveBeenCalled();
      const sql = (tx.$queryRaw.mock.calls[0] as [TemplateStringsArray])[0].join(
        '',
      );
      expect(sql).toMatch(/FOR UPDATE/);
    });

    it('impide al propietario mover stock de otra granja', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));

      await expect(
        service.registrarMovimiento(
          1,
          { tipo_movimiento: TipoMovimientoInventario.entrada, cantidad: 10 },
          OTRO_DUENO,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza (404) si el lote indicado no existe', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(
        service.registrarMovimiento(
          1,
          {
            tipo_movimiento: TipoMovimientoInventario.salida,
            cantidad: 10,
            lote_id: 99,
          },
          ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarMovimientos', () => {
    it('impide al propietario ver el historial de otra granja', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(insumoDe(DUENO.id));

      await expect(
        service.listarMovimientos(1, OTRO_DUENO, { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
