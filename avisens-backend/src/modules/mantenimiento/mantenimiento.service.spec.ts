import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';

describe('MantenimientoService', () => {
  let service: MantenimientoService;

  const prisma = {
    equipo: {
      findUnique: jest.fn(),
    },
    mantenimiento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mantenimientoRepuesto: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventarioInsumo: { findUnique: jest.fn(), update: jest.fn() },
    movimientoInventario: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear: CreateMantenimientoDto = {
    equipo_id: 1,
    tipo: 'Preventivo',
    fecha_programada: '2026-08-25T10:00:00Z',
    descripcion: 'Mantenimiento preventivo del equipo',
    estado: 'Programado',
  };

  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;

    return calls[0][0].where;
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;

    return calls[0][0].data;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MantenimientoService>(MantenimientoService);

    prisma.equipo.findUnique.mockResolvedValue({
      id: 1,
      galpon: {
        granja: {
          propietario_id: 5,
          id: 10,
        },
      },
    });

    prisma.mantenimiento.findUnique.mockResolvedValue({
      id: 1,
      equipo_id: 1,
      tipo: 'Preventivo',
      estado: 'programado',
      fecha_programada: new Date('2026-08-25T10:00:00Z'),
      equipo: {
        galpon: {
          granja: {
            id: 10,
            propietario_id: 5,
          },
        },
      },
      repuestos: [],
    });

    prisma.mantenimientoRepuesto.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation((operacion: unknown) =>
      typeof operacion === 'function'
        ? (operacion as (tx: typeof prisma) => unknown)(prisma)
        : Promise.resolve([[], 0]),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea el mantenimiento cuando el equipo es válido', async () => {
      prisma.mantenimiento.create.mockResolvedValue({
        id: 1,
      });

      await service.create(dtoCrear, admin);

      expect(prisma.equipo.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          galpon: {
            include: {
              granja: true,
            },
          },
        },
      });

      expect(prisma.mantenimiento.create).toHaveBeenCalledWith({
        data: {
          equipo_id: 1,
          tipo: 'Preventivo',
          fecha_programada: new Date('2026-08-25T10:00:00Z'),
          descripcion: 'Mantenimiento preventivo del equipo',
          estado: 'Programado',
        },
        include: {
          equipo: true,
        },
      });
    });

    it('un Propietario no puede crear un mantenimiento en un equipo ajeno (403)', async () => {
      prisma.equipo.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.create(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.mantenimiento.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el equipo no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.mantenimiento.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('un Propietario solo ve mantenimientos de sus equipos', async () => {
      await service.findAll(propietario, {
        page: 1,
        limit: 10,
      });

      expect(whereDe(prisma.mantenimiento.findMany).equipo).toEqual({
        galpon: {
          granja: {
            propietario_id: 5,
          },
        },
      });
    });

    it('un Admin no filtra mantenimientos por propietario', async () => {
      await service.findAll(admin, {
        page: 1,
        limit: 10,
      });

      expect(whereDe(prisma.mantenimiento.findMany)).toEqual({});
    });
  });

  describe('findOne', () => {
    it('encuentra un mantenimiento cuando existe', async () => {
      const resultado = await service.findOne('1', admin);

      expect(resultado).toEqual(
        expect.objectContaining({
          id: 1,
        }),
      );

      expect(prisma.mantenimiento.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        include: {
          equipo: {
            include: {
              galpon: {
                include: {
                  granja: true,
                },
              },
            },
          },
          repuestos: {
            include: { insumo: true },
            orderBy: { id: 'asc' },
          },
        },
      });
    });

    it('rechaza (404) si el mantenimiento no existe', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver un mantenimiento ajeno (403)', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.findOne('1', propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('actualiza un mantenimiento existente', async () => {
      prisma.mantenimiento.update.mockResolvedValue({
        id: 1,
        estado: 'Realizado',
      });

      const dtoActualizar = {
        estado: 'Realizado',
      };

      await service.update('1', dtoActualizar, admin);

      expect(prisma.mantenimiento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
          },
        }),
      );
    });

    it('si cambia el equipo, valida el nuevo equipo', async () => {
      prisma.mantenimiento.update.mockResolvedValue({
        id: 1,
      });

      await service.update(
        '1',
        {
          equipo_id: 2,
        },
        admin,
      );

      expect(prisma.equipo.findUnique).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
        include: {
          galpon: {
            include: {
              granja: true,
            },
          },
        },
      });
    });

    it('convierte las fechas y conserva el tiempo inactivo al actualizar', async () => {
      prisma.mantenimiento.update.mockResolvedValue({ id: 1 });

      await service.update(
        '1',
        {
          fecha_programada: '2026-09-01',
          fecha_ejecucion: '2026-09-02',
          tiempo_inactivo_horas: 3.5,
        },
        admin,
      );

      expect(dataDe(prisma.mantenimiento.update)).toEqual({
        fecha_programada: new Date('2026-09-01'),
        fecha_ejecucion: new Date('2026-09-02'),
        tiempo_inactivo_horas: 3.5,
      });
    });

    it('un Propietario no puede actualizar un mantenimiento ajeno (403)', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(
        service.update('1', { estado: 'Realizado' }, propietario),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.mantenimiento.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina un mantenimiento existente', async () => {
      prisma.mantenimiento.delete.mockResolvedValue({
        id: 1,
      });

      const resultado = await service.remove('1', admin);

      expect(prisma.mantenimiento.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(resultado).toEqual({
        message: 'Mantenimiento eliminado correctamente',
        id: 1,
      });
    });

    it('un Propietario no puede eliminar un mantenimiento ajeno (403)', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.remove('1', propietario)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.mantenimiento.delete).not.toHaveBeenCalled();
    });

    it('rechaza (404) al eliminar un mantenimiento que no existe', async () => {
      prisma.mantenimiento.findUnique.mockResolvedValue(null);

      await expect(service.remove('999', admin)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.mantenimiento.delete).not.toHaveBeenCalled();
    });
  });

  describe('repuestos', () => {
    it('descuenta stock y registra el movimiento de salida', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue(null);
      prisma.inventarioInsumo.findUnique.mockResolvedValue({
        id: 4,
        granja_id: 10,
        unidad_medida: 'unidad',
        activo: true,
      });
      prisma.$queryRaw.mockResolvedValueOnce([
        { stock_actual: new Prisma.Decimal(8) },
      ]);
      prisma.movimientoInventario.create.mockResolvedValue({ id: 30 });
      prisma.mantenimientoRepuesto.create.mockResolvedValue({ id: 40 });

      const resultado = await service.agregarRepuesto(
        1,
        {
          insumo_id: 4,
          cantidad: 2,
          clave_idempotencia: 'rep-1',
        },
        propietario,
      );

      expect(resultado.idempotente).toBe(false);
      expect(prisma.inventarioInsumo.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { stock_actual: new Prisma.Decimal(6) },
      });
      const llamadas = prisma.movimientoInventario.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(llamadas[0][0].data.tipo_movimiento).toBe(
        TipoMovimientoInventario.salida,
      );
    });

    it('no descuenta dos veces al repetir la clave', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue({
        id: 40,
        insumo_id: 4,
        cantidad: new Prisma.Decimal(2),
      });

      const resultado = await service.agregarRepuesto(
        1,
        {
          insumo_id: 4,
          cantidad: 2,
          clave_idempotencia: 'rep-1',
        },
        propietario,
      );

      expect(resultado.idempotente).toBe(true);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
    });

    it('rechaza repuestos de otra granja', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue(null);
      prisma.inventarioInsumo.findUnique.mockResolvedValue({
        id: 4,
        granja_id: 99,
        unidad_medida: 'unidad',
        activo: true,
      });

      await expect(
        service.agregarRepuesto(
          1,
          {
            insumo_id: 4,
            cantidad: 2,
            clave_idempotencia: 'rep-1',
          },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza el consumo si no hay stock suficiente', async () => {
      prisma.mantenimientoRepuesto.findUnique.mockResolvedValue(null);
      prisma.inventarioInsumo.findUnique.mockResolvedValue({
        id: 4,
        granja_id: 10,
        unidad_medida: 'unidad',
        activo: true,
      });
      prisma.$queryRaw.mockResolvedValueOnce([
        { stock_actual: new Prisma.Decimal(1) },
      ]);

      await expect(
        service.agregarRepuesto(
          1,
          {
            insumo_id: 4,
            cantidad: 2,
            clave_idempotencia: 'rep-1',
          },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
    });

    it('revertir restaura stock y conserva trazabilidad', async () => {
      prisma.mantenimientoRepuesto.findFirst.mockResolvedValue({ id: 40 });
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 40,
            insumo_id: 4,
            cantidad: new Prisma.Decimal(2),
            unidad_medida: 'unidad',
            revertido: false,
          },
        ])
        .mockResolvedValueOnce([{ stock_actual: new Prisma.Decimal(6) }]);
      prisma.movimientoInventario.create.mockResolvedValue({ id: 31 });
      prisma.mantenimientoRepuesto.update.mockResolvedValue({
        id: 40,
        revertido: true,
      });

      await service.revertirRepuesto(1, 40, propietario);

      expect(prisma.inventarioInsumo.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { stock_actual: new Prisma.Decimal(8) },
      });
      expect(prisma.mantenimientoRepuesto.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revertido: true, movimiento_reversion_id: 31 },
        }),
      );
    });
  });
});
