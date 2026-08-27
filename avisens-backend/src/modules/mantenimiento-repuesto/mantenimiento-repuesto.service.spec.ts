import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMantenimientoRepuestoDto } from './dto/create-mantenimiento-repuesto.dto';
import { UpdateMantenimientoRepuestoDto } from './dto/update-mantenimiento-repuesto.dto';
import { MantenimientoRepuestoService } from './mantenimiento-repuesto.service';

describe('MantenimientoRepuestoService', () => {
  let service: MantenimientoRepuestoService;
  let prisma: {
    mantenimiento: { findUnique: jest.Mock };
    inventarioInsumo: { findUnique: jest.Mock };
    mantenimientoRepuesto: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      mantenimiento: { findUnique: jest.fn() },
      inventarioInsumo: { findUnique: jest.fn() },
      mantenimientoRepuesto: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientoRepuestoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MantenimientoRepuestoService>(
      MantenimientoRepuestoService,
    );
  });

  it('debería crearse', () => {
    expect(service).toBeDefined();
  });

  describe('crear', () => {
    it('valida las relaciones y crea el repuesto', async () => {
      const dto: CreateMantenimientoRepuestoDto = {
        mantenimiento_id: 1,
        insumo_id: 2,
        description: 'Correa',
        cantidad: 2,
        costo_cop: 45000,
      };
      const created = { id: 10, ...dto, descripcion: dto.description };
      prisma.mantenimiento.findUnique.mockResolvedValue({ id: 1 });
      prisma.inventarioInsumo.findUnique.mockResolvedValue({ id: 2 });
      prisma.mantenimientoRepuesto.create.mockResolvedValue(created);

      await expect(service.crear(dto)).resolves.toEqual(created);
      expect(prisma.mantenimientoRepuesto.create).toHaveBeenCalledWith({
        data: {
          mantenimiento_id: 1,
          insumo_id: 2,
          descripcion: 'Correa',
          cantidad: 2,
          costo_cop: 45000,
        },
      });
    });

    it('lanza NotFoundException si no existe el mantenimiento', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ mantenimiento_id: 1, insumo_id: 2 }),
      ).rejects.toThrow(new NotFoundException('Mantenimiento no encontrado'));
      expect(prisma.inventarioInsumo.findUnique).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si no existe el insumo', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue({ id: 1 });
      prisma.inventarioInsumo.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ mantenimiento_id: 1, insumo_id: 2 }),
      ).rejects.toThrow(new NotFoundException('Insumo (repuesto) no encontrado'));
    });
  });

  describe('listar', () => {
    it('devuelve los repuestos paginados', async () => {
      const data = [{ id: 1 }];
      prisma.$transaction.mockResolvedValue([data, 3]);

      await expect(service.listar({ page: 2, limit: 1 })).resolves.toEqual({
        data,
        meta: { total: 3, page: 2, limit: 1, totalPages: 3 },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.mantenimientoRepuesto.findMany({
          orderBy: { id: 'desc' },
          skip: 1,
          take: 1,
        }),
        prisma.mantenimientoRepuesto.count(),
      ]);
    });
  });

  describe('listarPorMantenimiento', () => {
    it('valida el mantenimiento y filtra los repuestos', async () => {
      const data = [{ id: 1, mantenimiento_id: 4 }];
      prisma.mantenimiento.findUnique.mockResolvedValue({ id: 4 });
      prisma.$transaction.mockResolvedValue([data, 1]);

      await expect(
        service.listarPorMantenimiento(4, { page: 1, limit: 10 }),
      ).resolves.toEqual({
        data,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
      expect(prisma.mantenimientoRepuesto.findMany).toHaveBeenCalledWith({
        where: { mantenimiento_id: 4 },
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('obtener', () => {
    it('devuelve el repuesto cuando existe', async () => {
      const repuesto = { id: 1 };
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue(repuesto);

      await expect(service.obtener(1)).resolves.toEqual(repuesto);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1)).rejects.toThrow(
        new NotFoundException('Repuesto de mantenimiento no encontrado'),
      );
    });
  });

  describe('actualizar', () => {
    it('valida las relaciones y actualiza el repuesto', async () => {
      const dto: UpdateMantenimientoRepuestoDto = {
        mantenimiento_id: 2,
        insumo_id: 3,
        description: 'Nueva correa',
        cantidad: 1,
        costo_cop: 50000,
      };
      const updated = { id: 1, ...dto };
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue({ id: 1 });
      prisma.mantenimiento.findUnique.mockResolvedValue({ id: 2 });
      prisma.inventarioInsumo.findUnique.mockResolvedValue({ id: 3 });
      prisma.mantenimientoRepuesto.update.mockResolvedValue(updated);

      await expect(service.actualizar(1, dto)).resolves.toEqual(updated);
      expect(prisma.mantenimientoRepuesto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          mantenimiento_id: 2,
          insumo_id: 3,
          descripcion: 'Nueva correa',
          cantidad: 1,
          costo_cop: 50000,
        },
      });
    });
  });

  describe('eliminar', () => {
    it('elimina el repuesto y devuelve confirmación', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue({ id: 1 });
      prisma.mantenimientoRepuesto.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1)).resolves.toEqual({
        id: 1,
        eliminado: true,
      });
      expect(prisma.mantenimientoRepuesto.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});