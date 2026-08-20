import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
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
    proveedor: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const dtoCrear = {
    proveedor_id: 1,
    lote_id: 2,
    usuario_id: 3,
    codigo: 'OC-2026-001',
    fecha_pedido: '2026-08-20',
    valor_total_cop: 1250000,
    estado: 'pendiente',
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
    prisma.lote.findUnique.mockResolvedValue({ id: 2 });
    prisma.usuario.findUnique.mockResolvedValue({ id: 3 });
    prisma.ordenCompra.findUnique.mockResolvedValue({ id: 1 });
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea una orden cuando proveedor, lote y usuario existen', async () => {
      prisma.ordenCompra.create.mockResolvedValue({ id: 1, ...dtoCrear });

      await service.crear(dtoCrear);

      expect(prisma.ordenCompra.create).toHaveBeenCalled();

      const calls = prisma.ordenCompra.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(calls[0][0].data.codigo).toBe(dtoCrear.codigo);
      expect(calls[0][0].data.fecha_pedido).toBeInstanceOf(Date);
    });

    it('rechaza la creación si el proveedor no existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear)).rejects.toThrow(NotFoundException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });

    it('rechaza la creación si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear)).rejects.toThrow(NotFoundException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('devuelve órdenes paginadas', async () => {
      const ordenes = [{ id: 2, codigo: 'OC-2026-002' }];
      prisma.$transaction.mockResolvedValue([ordenes, 1]);

      const resultado = await service.listar({ page: 1, limit: 10 });

      expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(resultado).toEqual({
        data: ordenes,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });
  });

  describe('obtener', () => {
    it('rechaza con 404 si la orden no existe', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza los campos recibidos después de validar la orden', async () => {
      prisma.ordenCompra.update.mockResolvedValue({
        id: 1,
        estado: 'entregada',
      });

      await service.actualizar(1, { estado: 'entregada' });

      expect(prisma.ordenCompra.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ estado: 'entregada' }),
        }),
      );
    });

    it('no actualiza una orden inexistente', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.actualizar(99, { estado: 'cancelada' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina una orden existente', async () => {
      prisma.ordenCompra.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1)).resolves.toEqual({
        id: 1,
        eliminado: true,
      });
      expect(prisma.ordenCompra.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('no elimina una orden inexistente', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.eliminar(99)).rejects.toThrow(NotFoundException);
      expect(prisma.ordenCompra.delete).not.toHaveBeenCalled();
    });
  });
});