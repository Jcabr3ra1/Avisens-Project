// src/modules/movimientos-inventarios/movimientos-inventarios.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MovimientosInventarioService } from './movimientos-inventarios.service';
import { PrismaService } from '../../prisma/prisma.service';

// ✅ MOCK DE PRISMA
const prismaMock = {
  movimientoInventario: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  inventarioInsumo: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  lote: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('MovimientosInventarioService', () => {
  let service: MovimientosInventarioService;
  const prisma = prismaMock;

  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 1 };
  const admin = { id: 1, rol: 'ADMINISTRADOR', organizacion_id: 1 };

  const dtoCrear = {
    insumo_id: 1,
    lote_id: 1,
    tipo_movimiento: 'entrada',
    cantidad: 100,
    motivo: 'Compra mensual',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosInventarioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MovimientosInventarioService>(MovimientosInventarioService);

    // ✅ CORRECCIÓN: Simular $transaction para ambos usos
    prisma.$transaction.mockImplementation((arg: any) => {
      // Si es un array (lista de promesas) → Promise.all
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      // Si es un callback → ejecutar callback con prisma
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.resolve();
    });

    // Defaults
    prisma.inventarioInsumo.findUnique.mockResolvedValue({
      id: 1,
      nombre: 'Alimento balanceado',
      stock_actual: 500,
      unidad_medida: 'kg',
      activo: true,
    });

    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      codigo: 'LOTE-001',
      estado: 'activo',
      galpon: {
        granja: {
          propietario_id: 5,
        },
      },
    });

    prisma.movimientoInventario.findUnique.mockResolvedValue({
      id: 1,
      insumo_id: 1,
      lote_id: 1,
      tipo_movimiento: 'entrada',
      cantidad: 100,
      unidad_medida: 'kg',
      motivo: 'Compra mensual',
      stock_resultante: 600,
      usuario_id: 5,
      fecha_movimiento: new Date(),
    });

    // Para listar
    prisma.movimientoInventario.count.mockResolvedValue(0);
    prisma.movimientoInventario.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crear', () => {
    it('✅ debería crear un movimiento de entrada correctamente', async () => {
      prisma.movimientoInventario.create.mockResolvedValue({
        id: 1,
        ...dtoCrear,
        stock_resultante: 600,
        usuario_id: 5,
      });

      const result = await service.crear(dtoCrear, propietario);

      expect(result).toBeDefined();
      expect(result.stock_resultante).toBe(600);
      expect(prisma.inventarioInsumo.update).toHaveBeenCalled();
    });

    it('❌ debería rechazar (404) si el insumo no existe', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (400) si stock insuficiente para salida', async () => {
      const dtoSalida = {
        ...dtoCrear,
        tipo_movimiento: 'salida',
        cantidad: 1000,
      };

      await expect(service.crear(dtoSalida, propietario)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listar', () => {
    it('✅ Propietario: solo ve sus movimientos', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.movimientoInventario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario_id: 5 },
        })
      );
    });

    it('✅ Admin: ve todos los movimientos', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.movimientoInventario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe('obtener', () => {
    it('✅ debería obtener un movimiento por ID', async () => {
      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(prisma.movimientoInventario.findUnique).toHaveBeenCalled();
    });

    it('❌ debería rechazar (404) si el movimiento no existe', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (403) si el movimiento no es del usuario (no admin)', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 1,
        usuario_id: 999,
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('✅ debería actualizar un movimiento', async () => {
      prisma.movimientoInventario.update.mockResolvedValue({
        id: 1,
        motivo: 'Motivo actualizado',
      });

      const result = await service.actualizar(
        1,
        { motivo: 'Motivo actualizado' },
        propietario,
      );

      expect(result).toBeDefined();
      expect(prisma.movimientoInventario.update).toHaveBeenCalled();
    });

    it('❌ debería rechazar (403) si el movimiento no es del usuario (no admin)', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 1,
        usuario_id: 999,
      });

      await expect(
        service.actualizar(1, { motivo: 'Nuevo motivo' }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('eliminar', () => {
    it('✅ Admin: debería eliminar un movimiento de entrada y revertir el stock', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 1,
        insumo_id: 1,
        tipo_movimiento: 'entrada',
        cantidad: 100,
        usuario_id: 999,
      });
      prisma.movimientoInventario.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, admin);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prisma.inventarioInsumo.update).toHaveBeenCalled();
    });

    it('✅ Admin: debería eliminar un movimiento de salida y revertir el stock correctamente', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 2,
        insumo_id: 1,
        tipo_movimiento: 'salida',
        cantidad: 50,
        usuario_id: 999,
      });
      prisma.movimientoInventario.delete.mockResolvedValue({ id: 2 });

      const result = await service.eliminar(2, admin);

      expect(result).toEqual({ id: 2, eliminado: true });
      expect(prisma.inventarioInsumo.update).toHaveBeenCalled();
    });

    it('❌ Propietario: NO debería eliminar un movimiento (solo admin)', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 1,
        insumo_id: 1,
        tipo_movimiento: 'entrada',
        cantidad: 100,
        usuario_id: 5,
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.movimientoInventario.delete).not.toHaveBeenCalled();
    });

    it('❌ Propietario: NO debería eliminar un movimiento aunque sea suyo', async () => {
      prisma.movimientoInventario.findUnique.mockResolvedValue({
        id: 1,
        insumo_id: 1,
        tipo_movimiento: 'entrada',
        cantidad: 100,
        usuario_id: 5,
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.movimientoInventario.delete).not.toHaveBeenCalled();
    });
  });
});