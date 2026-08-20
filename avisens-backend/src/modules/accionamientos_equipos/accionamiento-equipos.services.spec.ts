// accionamientos-equipos.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccionamientosEquiposService } from './accionamientos-equipos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccionamientoEquipoDto } from './dto/create-accionamiento-equipo.dto';
import { UpdateAccionamientoEquipoDto } from './dto/update-accionamiento-equipo.dto';

describe('AccionamientosEquiposService', () => {
  let service: AccionamientosEquiposService;

  // Mock de Prisma
  const prisma = {
    accionamientoEquipo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    equipo: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    alerta: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Usuarios de prueba
  const admin = { id: 1, rol: 'Administrador', organizacion_id: 1 };
  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 1 };
  const otroPropietario = { id: 10, rol: 'Propietario', organizacion_id: 2 };

  // DTOs de prueba
  const dtoCrear: CreateAccionamientoEquipoDto = {
    equipo_id: 1,
    alerta_id: 1,
    origen: 'automatico',
    estado: 'encendido',
    valor_disparo: 31.5,
  };

  const dtoCerrar: UpdateAccionamientoEquipoDto = {
    estado: 'apagado',
  };

  // Helper para extraer where
  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ where: Record<string, unknown> }]>;
    return calls[0]?.[0]?.where || {};
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccionamientosEquiposService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccionamientosEquiposService>(AccionamientosEquiposService);

    // Configurar defaults
    prisma.$transaction.mockResolvedValue([[], 0]);

    // Equipo por defecto (es_actuador = true)
    prisma.equipo.findUnique.mockResolvedValue({
      id: 1,
      nombre: 'Ventilador Norte',
      es_actuador: true,
      galpon: {
        granja: {
          propietario_id: 5,
        },
      },
    });

    // Alerta por defecto
    prisma.alerta.findUnique.mockResolvedValue({
      id: 1,
      galpon: {
        granja: {
          propietario_id: 5,
        },
      },
    });

    // Accionamiento por defecto
    prisma.accionamientoEquipo.findUnique.mockResolvedValue({
      id: 1,
      equipo_id: 1,
      alerta_id: 1,
      origen: 'automatico',
      estado: 'encendido',
      valor_disparo: 31.5,
      usuario_id: null,
      fecha_inicio: new Date('2026-08-12T09:15:00Z'),
      fecha_fin: null,
      equipo: {
        id: 1,
        nombre: 'Ventilador Norte',
        es_actuador: true,
        galpon: {
          granja: {
            propietario_id: 5,
          },
        },
      },
      alerta: {
        id: 1,
        tipo: 'temperatura_alta',
        criticidad: 'critica',
        mensaje: 'Temperatura alta detectada',
      },
      usuario: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TESTS: CREAR
  // ============================================================
  describe('crear', () => {
    it('debería crear un accionamiento cuando el equipo es actuador y es del propietario', async () => {
      const expectedResult = { id: 1, ...dtoCrear };
      prisma.accionamientoEquipo.create.mockResolvedValue(expectedResult);

      const result = await service.crear(dtoCrear, propietario);

      expect(prisma.accionamientoEquipo.create).toHaveBeenCalled();
      expect(prisma.accionamientoEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipo_id: 1,
            alerta_id: 1,
            origen: 'automatico',
            estado: 'encendido',
            valor_disparo: 31.5,
          }),
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it('debería usar "automatico" como origen por defecto', async () => {
      const dtoSinOrigen = { equipo_id: 1 };
      prisma.accionamientoEquipo.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinOrigen, propietario);

      expect(prisma.accionamientoEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            origen: 'automatico',
          }),
        })
      );
    });

    it('debería usar "encendido" como estado por defecto', async () => {
      const dtoSinEstado = { equipo_id: 1 };
      prisma.accionamientoEquipo.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinEstado, propietario);

      expect(prisma.accionamientoEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'encendido',
          }),
        })
      );
    });

    it('debería establecer usuario_id = null si origen es "automatico"', async () => {
      const dtoAutomatico = { equipo_id: 1, origen: 'automatico' };
      prisma.accionamientoEquipo.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoAutomatico, propietario);

      expect(prisma.accionamientoEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuario_id: null,
          }),
        })
      );
    });

    it('debería establecer usuario_id = solicitante.id si origen NO es "automatico"', async () => {
      const dtoManual = { equipo_id: 1, origen: 'manual' };
      prisma.accionamientoEquipo.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoManual, propietario);

      expect(prisma.accionamientoEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuario_id: 5,
          }),
        })
      );
    });

    it('debería rechazar (404) si el equipo no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.accionamientoEquipo.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (400) si el equipo no es un actuador', async () => {
      prisma.equipo.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Sensor Temperatura',
        es_actuador: false,
        galpon: {
          granja: {
            propietario_id: 5,
          },
        },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.accionamientoEquipo.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (403) si el equipo no es del propietario', async () => {
      prisma.equipo.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Ventilador Norte',
        es_actuador: true,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.accionamientoEquipo.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (404) si la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.accionamientoEquipo.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (403) si la alerta no es del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.accionamientoEquipo.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: LISTAR
  // ============================================================
  describe('listar', () => {
    it('debería listar solo accionamientos de sus equipos si es Propietario', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      const findManyCalls = prisma.accionamientoEquipo.findMany.mock.calls;
      expect(findManyCalls.length).toBeGreaterThan(0);
      const where = findManyCalls[0]?.[0]?.where;
      expect(where).toEqual({
        equipo: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });
    });

    it('debería listar todos los accionamientos si es Admin', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      const findManyCalls = prisma.accionamientoEquipo.findMany.mock.calls;
      expect(findManyCalls.length).toBeGreaterThan(0);
      const where = findManyCalls[0]?.[0]?.where;
      expect(where).toEqual({});
    });

    it('debería usar $transaction para consistencia', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debería paginar correctamente', async () => {
      await service.listar(admin, { page: 2, limit: 5 });

      expect(prisma.accionamientoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('debería ordenar por fecha_inicio descendente', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.accionamientoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { fecha_inicio: 'desc' },
        })
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER
  // ============================================================
  describe('obtener', () => {
    it('debería obtener un accionamiento por ID', async () => {
      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(prisma.accionamientoEquipo.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it('debería rechazar (404) si el accionamiento no existe', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería rechazar (403) si el accionamiento es de equipo ajeno', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debería permitir a Admin ver cualquier accionamiento', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      const result = await service.obtener(1, admin);
      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // TESTS: CERRAR
  // ============================================================
  describe('cerrar', () => {
    it('debería cerrar un accionamiento y sumar horas_operacion', async () => {
      const fechaInicio = new Date('2026-08-12T09:15:00Z');
      const fechaFin = new Date('2026-08-12T10:05:00Z');

      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo_id: 1,
        fecha_inicio: fechaInicio,
        fecha_fin: null,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });

      prisma.accionamientoEquipo.update.mockResolvedValue({
        id: 1,
        estado: 'apagado',
        fecha_fin: fechaFin,
      });

      prisma.equipo.update.mockResolvedValue({
        id: 1,
        horas_operacion: 0.83,
      });

      const result = await service.cerrar(1, dtoCerrar, propietario);

      expect(result).toBeDefined();
      expect(result.horas_operacion_agregadas).toBeCloseTo(0.83, 2);
      expect(prisma.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: {
            horas_operacion: {
              increment: expect.any(Number),
            },
          },
        })
      );
    });

    it('debería rechazar (400) si el accionamiento ya está cerrado', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        fecha_fin: new Date(),
        equipo: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });

      await expect(service.cerrar(1, dtoCerrar, propietario)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.accionamientoEquipo.update).not.toHaveBeenCalled();
    });

    it('debería rechazar (403) si el accionamiento es de equipo ajeno', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.cerrar(1, dtoCerrar, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.accionamientoEquipo.update).not.toHaveBeenCalled();
    });

    it('debería actualizar el estado si se proporciona', async () => {
      const fechaInicio = new Date('2026-08-12T09:15:00Z');

      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo_id: 1,
        fecha_inicio: fechaInicio,
        fecha_fin: null,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });

      prisma.accionamientoEquipo.update.mockResolvedValue({
        id: 1,
        estado: 'apagado',
      });

      await service.cerrar(1, { estado: 'apagado' }, propietario);

      expect(prisma.accionamientoEquipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'apagado',
            fecha_fin: expect.any(Date),
          }),
        })
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER POR EQUIPO
  // ============================================================
  describe('obtenerPorEquipo', () => {
    it('debería obtener todos los accionamientos de un equipo', async () => {
      const expectedData = [
        { id: 1, equipo_id: 1, estado: 'encendido' },
        { id: 2, equipo_id: 1, estado: 'apagado' },
      ];
      prisma.$transaction.mockResolvedValue([expectedData, 2]);

      const result = await service.obtenerPorEquipo(1, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(expectedData);
      expect(result.meta.total).toBe(2);
      expect(prisma.accionamientoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { equipo_id: 1 },
        })
      );
    });

    it('debería rechazar (403) si el equipo no es del propietario', async () => {
      prisma.equipo.findUnique.mockResolvedValue({
        id: 1,
        es_actuador: true,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(
        service.obtenerPorEquipo(1, propietario, { page: 1, limit: 10 })
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.accionamientoEquipo.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: OBTENER POR ALERTA
  // ============================================================
  describe('obtenerPorAlerta', () => {
    it('debería obtener todos los accionamientos de una alerta', async () => {
      const expectedData = [
        { id: 1, alerta_id: 1, estado: 'encendido' },
        { id: 2, alerta_id: 1, estado: 'apagado' },
      ];
      prisma.$transaction.mockResolvedValue([expectedData, 2]);

      const result = await service.obtenerPorAlerta(1, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(expectedData);
      expect(result.meta.total).toBe(2);
      expect(prisma.accionamientoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { alerta_id: 1 },
        })
      );
    });

    it('debería rechazar (403) si la alerta no es del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(
        service.obtenerPorAlerta(1, propietario, { page: 1, limit: 10 })
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.accionamientoEquipo.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ELIMINAR
  // ============================================================
  describe('eliminar', () => {
    it('debería eliminar un accionamiento cuando es dueño', async () => {
      prisma.accionamientoEquipo.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, propietario);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prisma.accionamientoEquipo.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('debería rechazar (403) si el accionamiento es de equipo ajeno', async () => {
      prisma.accionamientoEquipo.findUnique.mockResolvedValue({
        id: 1,
        equipo: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.accionamientoEquipo.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ESTADÍSTICAS
  // ============================================================
  describe('obtenerEstadisticas', () => {
    it('debería calcular estadísticas correctamente para Propietario', async () => {
      prisma.accionamientoEquipo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(4) // activos
        .mockResolvedValueOnce(6) // cerrados
        .mockResolvedValueOnce(7) // automaticos
        .mockResolvedValueOnce(3); // manuales

      const stats = await service.obtenerEstadisticas(propietario);

      expect(stats).toEqual({
        total: 10,
        activos: 4,
        cerrados: 6,
        automaticos: 7,
        manuales: 3,
        tasa_automatizacion: 70,
      });
    });

    it('debería calcular estadísticas correctamente para Admin', async () => {
      prisma.accionamientoEquipo.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(8) // activos
        .mockResolvedValueOnce(12) // cerrados
        .mockResolvedValueOnce(15) // automaticos
        .mockResolvedValueOnce(5); // manuales

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 20,
        activos: 8,
        cerrados: 12,
        automaticos: 15,
        manuales: 5,
        tasa_automatizacion: 75,
      });
    });

    it('debería devolver tasa_automatizacion = 0 cuando no hay total', async () => {
      prisma.accionamientoEquipo.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // activos
        .mockResolvedValueOnce(0) // cerrados
        .mockResolvedValueOnce(0) // automaticos
        .mockResolvedValueOnce(0); // manuales

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 0,
        activos: 0,
        cerrados: 0,
        automaticos: 0,
        manuales: 0,
        tasa_automatizacion: 0,
      });
    });
  });
});