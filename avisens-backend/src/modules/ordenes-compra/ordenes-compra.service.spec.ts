import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdenesCompraService } from './ordenes-compra.service';
import { EstadoOrdenCompra } from '@prisma/client';
import { ROLES } from '../../common/auth/roles';

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
    estado: EstadoOrdenCompra.pendiente,
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
        estado: EstadoOrdenCompra.entregada,
      });

      await service.actualizar(1, { estado: EstadoOrdenCompra.entregada });

      expect(prisma.ordenCompra.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ estado: EstadoOrdenCompra.entregada }),
        }),
      );
    });

    it('no actualiza una orden inexistente', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.actualizar(99, { estado: EstadoOrdenCompra.cancelada })).rejects.toThrow(
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

  describe('alcance por rol', () => {
    const ADMIN = { id: 1, rol: ROLES.ADMINISTRADOR };
    const DUENO = { id: 7, rol: ROLES.PROPIETARIO };
    const OTRO = { id: 8, rol: ROLES.PROPIETARIO };

    const conLote = (propietarioId: number) => ({
      id: 1,
      usuario_id: 99,
      lote_id: 2,
      lote: { id: 2, galpon: { granja: { propietario_id: propietarioId } } },
    });

    const sinLote = (creadorId: number) => ({
      id: 1,
      usuario_id: creadorId,
      lote_id: null,
      lote: null,
    });

    describe('obtener', () => {
      it('el propietario ve la orden de su lote', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(conLote(DUENO.id));
        const r = await service.obtener(1, DUENO);
        expect(r.id).toBe(1);
      });

      it('impide al propietario ver la orden del lote de otro', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(conLote(DUENO.id));
        await expect(service.obtener(1, OTRO)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('SIN LOTE: el propietario ve la que el creo', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(sinLote(DUENO.id));
        const r = await service.obtener(1, DUENO);
        expect(r.id).toBe(1);
      });

      it('SIN LOTE: impide al propietario ver la que creo otro', async () => {
        // Este es el agujero que se arregla: antes, al no haber lote, no se
        // comprobaba nada y cualquier propietario podia leerla.
        prisma.ordenCompra.findUnique.mockResolvedValue(sinLote(DUENO.id));
        await expect(service.obtener(1, OTRO)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('el administrador ve cualquier orden', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(sinLote(999));
        const r = await service.obtener(1, ADMIN);
        expect(r.id).toBe(1);
      });
    });

    describe('actualizar y eliminar heredan la comprobacion', () => {
      it('impide actualizar una orden sin lote de otro propietario', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(sinLote(DUENO.id));
        await expect(
          service.actualizar(1, { codigo: 'X' }, OTRO),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
      });

      it('impide eliminar una orden sin lote de otro propietario', async () => {
        prisma.ordenCompra.findUnique.mockResolvedValue(sinLote(DUENO.id));
        await expect(service.eliminar(1, OTRO)).rejects.toThrow(
          ForbiddenException,
        );
        expect(prisma.ordenCompra.delete).not.toHaveBeenCalled();
      });
    });

    describe('listar', () => {
      it('el administrador ve todas', async () => {
        prisma.$transaction.mockResolvedValue([[], 0]);
        await service.listar({ page: 1, limit: 10 }, ADMIN);
        expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: {} }),
        );
      });

      it('el propietario ve las de sus lotes Y las suyas sin lote', async () => {
        prisma.$transaction.mockResolvedValue([[], 0]);
        await service.listar({ page: 1, limit: 10 }, DUENO);

        const [args] = prisma.ordenCompra.findMany.mock.calls[0] as [
          { where: { OR: unknown[] } },
        ];
        expect(args.where.OR).toEqual([
          { lote: { galpon: { granja: { propietario_id: DUENO.id } } } },
          { lote_id: null, usuario_id: DUENO.id },
        ]);
      });
    });
  });
});
