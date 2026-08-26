import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoOrdenCompra, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';
import { OrdenesCompraService } from './ordenes-compra.service';

describe('OrdenesCompraService', () => {
  let service: OrdenesCompraService;

  const prisma = {
    ordenCompra: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    granja: { findUnique: jest.fn() },
    proveedor: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    inventarioInsumo: { findUnique: jest.fn(), update: jest.fn() },
    detalleOrdenCompra: {
      create: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    movimientoInventario: { findMany: jest.fn(), create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const dtoCrear = {
    proveedor_id: 1,
    lote_id: 2,
    usuario_id: 5,
    codigo: 'OC-2026-001',
    fecha_pedido: '2026-08-20',
    valor_total_cop: 1250000,
    estado: EstadoOrdenCompra.pendiente,
  };

  const ordenExistente = {
    id: 1,
    granja_id: 10,
    lote_id: 2,
    codigo: 'OC-2026-001',
    estado: EstadoOrdenCompra.pendiente,
    granja: { id: 10, nombre: 'Granja Norte', propietario_id: 5 },
    detalles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesCompraService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrdenesCompraService>(OrdenesCompraService);

    prisma.proveedor.findUnique.mockResolvedValue({ id: 1 });
    prisma.usuario.findUnique.mockResolvedValue({ id: 5 });
    prisma.granja.findUnique.mockResolvedValue({
      id: 10,
      propietario_id: 5,
    });
    prisma.lote.findUnique.mockResolvedValue({
      id: 2,
      galpon: { granja: { id: 10, propietario_id: 5 } },
    });
    prisma.ordenCompra.findUnique.mockResolvedValue(ordenExistente);
    prisma.$transaction.mockImplementation((operacion: unknown) =>
      typeof operacion === 'function'
        ? (operacion as (tx: typeof prisma) => unknown)(prisma)
        : Promise.resolve([[], 0]),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('infiere la granja desde el lote', async () => {
      prisma.ordenCompra.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.ordenCompra.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(
        expect.objectContaining({ granja_id: 10, lote_id: 2 }),
      );
    });

    it('permite una orden sin lote cuando se indica una granja propia', async () => {
      prisma.ordenCompra.create.mockResolvedValue({ id: 1 });

      await service.crear(
        { ...dtoCrear, lote_id: undefined, granja_id: 10 },
        propietario,
      );

      expect(prisma.granja.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.ordenCompra.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(expect.objectContaining({ granja_id: 10 }));
    });

    it('rechaza una orden sin lote ni granja', async () => {
      await expect(
        service.crear({ ...dtoCrear, lote_id: undefined }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });

    it('rechaza cuando lote y granja no coinciden', async () => {
      await expect(
        service.crear({ ...dtoCrear, granja_id: 99 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });

    it('rechaza un lote perteneciente a otro propietario', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 2,
        galpon: { granja: { id: 10, propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });

    it('rechaza la creación si el proveedor no existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('filtra las órdenes del propietario por granja', async () => {
      const ordenes = [{ id: 2, codigo: 'OC-2026-002' }];
      prisma.$transaction.mockResolvedValue([ordenes, 1]);

      const resultado = await service.listar(
        { page: 1, limit: 10 },
        propietario,
      );

      expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { granja: { propietario_id: propietario.id } },
          skip: 0,
          take: 10,
        }),
      );
      expect(resultado.meta.total).toBe(1);
    });

    it('permite al administrador listar todas las órdenes', async () => {
      await service.listar({ page: 1, limit: 10 }, admin);

      expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('obtener', () => {
    it('rechaza con 404 si la orden no existe', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza una orden sin lote de otra granja', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        ...ordenExistente,
        lote_id: null,
        granja: { id: 10, nombre: 'Ajena', propietario_id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('conserva la coherencia entre el lote existente y la granja', async () => {
      prisma.ordenCompra.update.mockResolvedValue({
        ...ordenExistente,
        estado: EstadoOrdenCompra.cancelada,
      });

      await service.actualizar(
        1,
        { estado: EstadoOrdenCompra.cancelada },
        propietario,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.ordenCompra.update.mock.calls[0][0] as {
        where: { id: number };
        data: Record<string, unknown>;
      };
      expect(llamada.where).toEqual({ id: 1 });
      expect(llamada.data).toEqual(
        expect.objectContaining({
          granja_id: 10,
          estado: EstadoOrdenCompra.cancelada,
        }),
      );
    });

    it('no actualiza una orden inexistente', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(99, { estado: EstadoOrdenCompra.cancelada }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });

    it('impide actualizar una orden sin lote de otra granja', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        ...ordenExistente,
        lote_id: null,
        granja: { id: 99, nombre: 'Ajena', propietario_id: 999 },
      });

      await expect(
        service.actualizar(1, { codigo: 'X' }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina una orden accesible', async () => {
      prisma.ordenCompra.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1, propietario)).resolves.toEqual({
        id: 1,
        eliminado: true,
      });
      expect(prisma.ordenCompra.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('impide eliminar una orden sin lote de otra granja', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        ...ordenExistente,
        lote_id: null,
        granja: { id: 99, nombre: 'Ajena', propietario_id: 999 },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.ordenCompra.delete).not.toHaveBeenCalled();
    });
  });

  describe('detalles y recepción', () => {
    it('agrega un insumo de la misma granja y recalcula el total', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue({
        id: 4,
        granja_id: 10,
        unidad_medida: 'kg',
        activo: true,
      });
      prisma.detalleOrdenCompra.create.mockResolvedValue({ id: 8 });
      prisma.detalleOrdenCompra.aggregate.mockResolvedValue({
        _sum: { subtotal_cop: new Prisma.Decimal(500000) },
      });

      await service.agregarDetalle(
        1,
        { insumo_id: 4, cantidad: 10, precio_unitario_cop: 50000 },
        propietario,
      );

      expect(prisma.detalleOrdenCompra.create).toHaveBeenCalled();
      expect(prisma.ordenCompra.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { valor_total_cop: new Prisma.Decimal(500000) },
      });
    });

    it('rechaza un insumo de otra granja', async () => {
      prisma.inventarioInsumo.findUnique.mockResolvedValue({
        id: 4,
        granja_id: 99,
        unidad_medida: 'kg',
        activo: true,
      });

      await expect(
        service.agregarDetalle(
          1,
          { insumo_id: 4, cantidad: 10, precio_unitario_cop: 50000 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('recibe parcialmente y crea una entrada de inventario', async () => {
      prisma.movimientoInventario.findMany.mockResolvedValue([]);
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 8,
            insumo_id: 4,
            cantidad: new Prisma.Decimal(10),
            cantidad_recibida: new Prisma.Decimal(0),
            unidad_medida: 'kg',
          },
        ])
        .mockResolvedValueOnce([
          { id: 4, stock_actual: new Prisma.Decimal(20) },
        ]);
      prisma.movimientoInventario.create.mockResolvedValue({ id: 12 });

      const resultado = await service.recibir(
        1,
        {
          clave_idempotencia: 'recepcion-1',
          items: [{ detalle_id: 8, cantidad: 4 }],
        },
        propietario,
      );

      expect(resultado.completa).toBe(false);
      expect(prisma.inventarioInsumo.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { stock_actual: new Prisma.Decimal(24) },
      });
      const actualizaciones = prisma.ordenCompra.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(actualizaciones.at(-1)?.[0].data.estado).toBe(
        EstadoOrdenCompra.en_proceso,
      );
    });

    it('repetir la misma clave devuelve la recepción sin duplicar stock', async () => {
      prisma.movimientoInventario.findMany.mockResolvedValue([
        {
          detalle_orden_compra_id: 8,
          cantidad: new Prisma.Decimal(4),
        },
      ]);

      const resultado = await service.recibir(
        1,
        {
          clave_idempotencia: 'recepcion-1',
          items: [{ detalle_id: 8, cantidad: 4 }],
        },
        propietario,
      );

      expect(resultado.idempotente).toBe(true);
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
      expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
    });
  });
});
