import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';

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
        },
      },
    });

    prisma.mantenimiento.findUnique.mockResolvedValue({
      id: 1,
      equipo_id: 1,
      tipo: 'Preventivo',
      fecha_programada: new Date('2026-08-25T10:00:00Z'),
      equipo: {
        galpon: {
          granja: {
            propietario_id: 5,
          },
        },
      },
    });

    prisma.$transaction.mockResolvedValue([[], 0]);
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
});
