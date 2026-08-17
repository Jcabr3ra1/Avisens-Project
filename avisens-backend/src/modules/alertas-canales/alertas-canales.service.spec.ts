// alertas-canales.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertasCanalesService } from './alertas-canales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertasCanalesDto } from './dto/create-alertas-canales.dto';
import { UpdateAlertasCanalesDto } from './dto/update-alertas-canales.dto';

describe('AlertasCanalesService', () => {
  let service: AlertasCanalesService;

  // Mock de Prisma
  const prisma = {
    alertaCanal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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
  const dtoCrear: CreateAlertasCanalesDto = {
    alerta_id: 1,
    canal: 'sms',
    estado_envio: 'pendiente',
  };

  const dtoActualizar: UpdateAlertasCanalesDto = {
    estado_envio: 'enviado',
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
        AlertasCanalesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AlertasCanalesService>(AlertasCanalesService);

    // Configurar defaults
    prisma.$transaction.mockResolvedValue([[], 0]);

    // Alerta por defecto del propietario 5
    prisma.alerta.findUnique.mockResolvedValue({
      id: 1,
      galpon: {
        granja: {
          propietario_id: 5,
        },
      },
    });

    // Canal por defecto
    prisma.alertaCanal.findUnique.mockResolvedValue({
      id: 1,
      alerta_id: 1,
      canal: 'sms',
      estado_envio: 'pendiente',
      fecha_envio: null,
      alerta: {
        galpon: {
          granja: {
            propietario_id: 5,
          },
        },
      },
    });

    // Canal duplicado por defecto (no existe)
    prisma.alertaCanal.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TESTS: CREAR
  // ============================================================
  describe('crear', () => {
    it('debería crear un canal cuando la alerta es del propietario', async () => {
      const expectedResult = { id: 1, ...dtoCrear };
      prisma.alertaCanal.create.mockResolvedValue(expectedResult);

      const result = await service.crear(dtoCrear, propietario);

      expect(prisma.alertaCanal.create).toHaveBeenCalled();
      expect(prisma.alertaCanal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alerta_id: 1,
            canal: 'sms',
            estado_envio: 'pendiente',
          }),
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it('debería usar "pendiente" como estado por defecto si no se envía', async () => {
      const dtoSinEstado = { alerta_id: 1, canal: 'email' };
      prisma.alertaCanal.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinEstado, propietario);

      expect(prisma.alertaCanal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado_envio: 'pendiente',
          }),
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

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (404) si la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });

    it('debería rechazar (403) si ya existe un canal duplicado', async () => {
      prisma.alertaCanal.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: LISTAR
  // ============================================================
  describe('listar', () => {
    it('debería listar solo canales de sus alertas si es Propietario', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      const findManyCalls = prisma.alertaCanal.findMany.mock.calls;
      expect(findManyCalls.length).toBeGreaterThan(0);
      const where = findManyCalls[0]?.[0]?.where;
      expect(where).toEqual({
        alerta: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });
    });

    it('debería listar todos los canales si es Admin', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      const findManyCalls = prisma.alertaCanal.findMany.mock.calls;
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

      expect(prisma.alertaCanal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER
  // ============================================================
  describe('obtener', () => {
    it('debería obtener un canal por ID', async () => {
      const expectedResult = {
        id: 1,
        alerta_id: 1,
        canal: 'sms',
        estado_envio: 'pendiente',
      };
      prisma.alertaCanal.findUnique.mockResolvedValue({
        ...expectedResult,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });

      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(prisma.alertaCanal.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it('debería rechazar (404) si el canal no existe', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería rechazar (403) si el canal es de alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
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

    it('debería permitir a Admin ver cualquier canal', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
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
  // TESTS: ACTUALIZAR
  // ============================================================
  describe('actualizar', () => {
    it('debería actualizar un canal', async () => {
      const dto = { estado_envio: 'enviado' };
      prisma.alertaCanal.update.mockResolvedValue({ id: 1, ...dto });

      const result = await service.actualizar(1, dto, propietario);

      expect(prisma.alertaCanal.update).toHaveBeenCalled();
      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            estado_envio: 'enviado',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('debería convertir fecha_envio a Date si se envía', async () => {
      const dto = { fecha_envio: '2024-01-15T12:00:00Z' };
      prisma.alertaCanal.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, dto, propietario);

      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fecha_envio: expect.any(Date),
          }),
        })
      );
    });

    it('debería permitir establecer fecha_envio como null', async () => {
      const dto = { fecha_envio: null as any };
      prisma.alertaCanal.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, dto, propietario);

      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fecha_envio: null,
          }),
        })
      );
    });

    it('debería retornar el registro actual si no hay datos para actualizar', async () => {
      const dto = {};
      const expectedResult = { id: 1 };
      jest.spyOn(service, 'obtenerCanalConValidacion').mockResolvedValue(expectedResult as any);

      const result = await service.actualizar(1, dto, propietario);

      expect(result).toEqual(expectedResult);
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });

    it('debería rechazar (403) si el canal es de alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(
        service.actualizar(1, { estado_envio: 'enviado' }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: MARCAR COMO ENVIADO
  // ============================================================
  describe('marcarComoEnviado', () => {
    beforeEach(() => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });
    });

    it('debería marcar como enviado cuando es dueño', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'enviado',
        fecha_envio: new Date(),
      });

      const result = await service.marcarComoEnviado(1, propietario);

      expect(result).toBeDefined();
      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            estado_envio: 'enviado',
            fecha_envio: expect.any(Date),
          }),
        })
      );
    });

    it('debería rechazar (403) si el canal es de alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.marcarComoEnviado(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: MARCAR COMO FALLIDO
  // ============================================================
  describe('marcarComoFallido', () => {
    beforeEach(() => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });
    });

    it('debería marcar como fallido cuando es dueño', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'fallido',
      });

      const result = await service.marcarComoFallido(1, propietario);

      expect(result).toBeDefined();
      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            estado_envio: 'fallido',
          }),
        })
      );
    });

    it('debería rechazar (403) si el canal es de alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 999,
            },
          },
        },
      });

      await expect(service.marcarComoFallido(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ACTUALIZAR ESTADO
  // ============================================================
  describe('actualizarEstadoEnvio', () => {
    beforeEach(() => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: {
              propietario_id: 5,
            },
          },
        },
      });
    });

    it('debería actualizar el estado a "en_proceso"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'en_proceso',
      });

      const result = await service.actualizarEstadoEnvio(1, 'en_proceso', propietario);

      expect(result).toBeDefined();
      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado_envio: 'en_proceso',
          }),
        })
      );
    });

    it('debería establecer fecha_envio cuando estado es "enviado"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'enviado',
        fecha_envio: new Date(),
      });

      await service.actualizarEstadoEnvio(1, 'enviado', propietario);

      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado_envio: 'enviado',
            fecha_envio: expect.any(Date),
          }),
        })
      );
    });

    it('debería NO establecer fecha_envio cuando estado no es "enviado"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'fallido',
      });

      await service.actualizarEstadoEnvio(1, 'fallido', propietario);

      expect(prisma.alertaCanal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            fecha_envio: expect.anything(),
          }),
        })
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER POR ALERTA
  // ============================================================
  describe('obtenerPorAlerta', () => {
    it('debería obtener todos los canales de una alerta', async () => {
      const expectedData = [
        { id: 1, alerta_id: 1, canal: 'sms' },
        { id: 2, alerta_id: 1, canal: 'email' },
      ];
      prisma.$transaction.mockResolvedValue([expectedData, 2]);

      const result = await service.obtenerPorAlerta(1, propietario, { page: 1, limit: 10 });

      expect(result.data).toEqual(expectedData);
      expect(result.meta.total).toBe(2);
      expect(prisma.alertaCanal.findMany).toHaveBeenCalledWith(
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
      expect(prisma.alertaCanal.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ELIMINAR
  // ============================================================
  describe('eliminar', () => {
    it('debería eliminar un canal cuando es dueño', async () => {
      prisma.alertaCanal.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, propietario);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prisma.alertaCanal.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('debería rechazar (403) si el canal es de alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
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
      expect(prisma.alertaCanal.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ELIMINAR POR ALERTA
  // ============================================================
  describe('eliminarPorAlerta', () => {
    it('debería eliminar todos los canales de una alerta', async () => {
      prisma.alertaCanal.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.eliminarPorAlerta(1, propietario);

      expect(result).toEqual({
        alerta_id: 1,
        eliminados: 3,
      });
      expect(prisma.alertaCanal.deleteMany).toHaveBeenCalledWith({
        where: { alerta_id: 1 },
      });
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

      await expect(service.eliminarPorAlerta(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.deleteMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS: ESTADÍSTICAS
  // ============================================================
  describe('obtenerEstadisticas', () => {
    it('debería calcular estadísticas correctamente para Propietario', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(6)   // enviados
        .mockResolvedValueOnce(2)   // pendientes
        .mockResolvedValueOnce(2);  // fallidos

      const stats = await service.obtenerEstadisticas(propietario);

      expect(stats).toEqual({
        total: 10,
        enviados: 6,
        pendientes: 2,
        fallidos: 2,
        tasa_exito: 60,
      });
    });

    it('debería calcular estadísticas correctamente para Admin', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(15)  // enviados
        .mockResolvedValueOnce(3)   // pendientes
        .mockResolvedValueOnce(2);  // fallidos

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 20,
        enviados: 15,
        pendientes: 3,
        fallidos: 2,
        tasa_exito: 75,
      });
    });

    it('debería devolver tasa_exito = 0 cuando no hay total', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(0)   // total
        .mockResolvedValueOnce(0)   // enviados
        .mockResolvedValueOnce(0)   // pendientes
        .mockResolvedValueOnce(0);  // fallidos

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 0,
        enviados: 0,
        pendientes: 0,
        fallidos: 0,
        tasa_exito: 0,
      });
    });
  });
});