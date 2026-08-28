// usuarios-galpones.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsuariosGalponesService } from './usuarios-galpones.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsuariosGalponesService', () => {
  let service: UsuariosGalponesService;

  // Mock de Prisma
  const prismaMock = {
    usuarioGalpon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    galpon: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 1 };
  const admin = { id: 1, rol: 'ADMINISTRADOR', organizacion_id: 1 };
  const otroPropietario = { id: 10, rol: 'Propietario', organizacion_id: 2 };

  const dtoCrear = {
    usuario_id: 2,
    galpon_id: 1,
    rol_asignacion: 'operario',
    activa: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosGalponesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsuariosGalponesService>(UsuariosGalponesService);

    // Configurar $transaction para ambos usos
    prismaMock.$transaction.mockImplementation((arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return arg(prismaMock);
      }
      return Promise.resolve();
    });

    // Defaults - Usuario existe y está activo
    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 2,
      nombre_completo: 'Juan Pérez',
      email: 'juan@test.com',
      activo: true,
    });

    // Defaults - Galpón existe y es del propietario 5
    prismaMock.galpon.findUnique.mockResolvedValue({
      id: 1,
      nombre: 'Galpón Norte',
      codigo: 'GALPON-01',
      granja: {
        id: 1,
        nombre: 'Granja Central',
        propietario_id: 5,
      },
    });

    // Defaults - Asignación existe
    prismaMock.usuarioGalpon.findUnique.mockResolvedValue({
      id: 1,
      usuario_id: 2,
      galpon_id: 1,
      rol_asignacion: 'operario',
      fecha_asignacion: new Date(),
      activa: true,
      usuario: {
        id: 2,
        nombre_completo: 'Juan Pérez',
        email: 'juan@test.com',
        cedula: '123456789',
        telefono: '3001234567',
        rol_id: 1,
      },
      galpon: {
        id: 1,
        nombre: 'Galpón Norte',
        codigo: 'GALPON-01',
        granja: {
          id: 1,
          nombre: 'Granja Central',
          propietario_id: 5,
        },
      },
    });

    // No existe asignación duplicada por defecto
    prismaMock.usuarioGalpon.findFirst.mockResolvedValue(null);

    // Para listar
    prismaMock.usuarioGalpon.count.mockResolvedValue(0);
    prismaMock.usuarioGalpon.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TESTS: CREAR
  // ============================================================
  describe('crear', () => {
    it('✅ debería crear una asignación correctamente', async () => {
      prismaMock.usuarioGalpon.create.mockResolvedValue({
        id: 1,
        ...dtoCrear,
        fecha_asignacion: new Date(),
      });

      const result = await service.crear(dtoCrear, propietario);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaMock.usuarioGalpon.create).toHaveBeenCalled();
    });

    it('✅ debería usar activa = true por defecto', async () => {
      const dtoSinActiva = {
        usuario_id: 2,
        galpon_id: 1,
        rol_asignacion: 'operario',
      };
      prismaMock.usuarioGalpon.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinActiva, propietario);

      expect(prismaMock.usuarioGalpon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activa: true,
          }),
        }),
      );
    });

    it('❌ debería rechazar (404) si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (400) si el usuario está inactivo', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 2,
        nombre_completo: 'Juan Pérez',
        email: 'juan@test.com',
        activo: false,
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('❌ debería rechazar (404) si el galpón no existe', async () => {
      prismaMock.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (403) si el galpón no es del propietario', async () => {
      prismaMock.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: {
          propietario_id: 999,
        },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('❌ debería rechazar (400) si ya existe una asignación activa duplicada', async () => {
      prismaMock.usuarioGalpon.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TESTS: LISTAR
  // ============================================================
  describe('listar', () => {
    it('✅ Propietario: solo ve asignaciones de sus galpones', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prismaMock.usuarioGalpon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            galpon: {
              granja: {
                propietario_id: 5,
              },
            },
          },
        }),
      );
    });

    it('✅ Admin: ve todas las asignaciones', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prismaMock.usuarioGalpon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('✅ debería paginar correctamente', async () => {
      await service.listar(admin, { page: 2, limit: 5 });

      expect(prismaMock.usuarioGalpon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER
  // ============================================================
  describe('obtener', () => {
    it('✅ debería obtener una asignación por ID', async () => {
      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaMock.usuarioGalpon.findUnique).toHaveBeenCalled();
    });

    it('❌ debería rechazar (404) si la asignación no existe', async () => {
      prismaMock.usuarioGalpon.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (403) si la asignación no es del propietario', async () => {
      prismaMock.usuarioGalpon.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // TESTS: ACTUALIZAR
  // ============================================================
  describe('actualizar', () => {
    it('✅ debería actualizar una asignación', async () => {
      const dto = { rol_asignacion: 'supervisor' };
      prismaMock.usuarioGalpon.update.mockResolvedValue({
        id: 1,
        ...dto,
      });

      const result = await service.actualizar(1, dto, propietario);

      expect(result).toBeDefined();
      expect(prismaMock.usuarioGalpon.update).toHaveBeenCalled();
    });

    it('✅ debería retornar la asignación si no hay datos para actualizar', async () => {
      const dto = {};
      const result = await service.actualizar(1, dto, propietario);

      expect(result).toBeDefined();
      expect(prismaMock.usuarioGalpon.update).not.toHaveBeenCalled();
    });

    it('❌ debería rechazar (403) si la asignación no es del propietario', async () => {
      prismaMock.usuarioGalpon.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(
        service.actualizar(1, { rol_asignacion: 'supervisor' }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // TESTS: ACTIVAR / DESACTIVAR
  // ============================================================
  describe('activar / desactivar', () => {
    it('✅ debería activar una asignación', async () => {
      prismaMock.usuarioGalpon.update.mockResolvedValue({
        id: 1,
        activa: true,
      });

      const result = await service.activar(1, propietario);

      expect(result.activa).toBe(true);
      expect(prismaMock.usuarioGalpon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { activa: true },
        }),
      );
    });

    it('✅ debería desactivar una asignación', async () => {
      prismaMock.usuarioGalpon.update.mockResolvedValue({
        id: 1,
        activa: false,
      });

      const result = await service.desactivar(1, propietario);

      expect(result.activa).toBe(false);
      expect(prismaMock.usuarioGalpon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { activa: false },
        }),
      );
    });

    it('❌ debería rechazar (403) si la asignación no es del propietario', async () => {
      prismaMock.usuarioGalpon.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.activar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // TESTS: ELIMINAR
  // ============================================================
  describe('eliminar', () => {
    it('✅ debería eliminar una asignación', async () => {
      prismaMock.usuarioGalpon.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, propietario);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prismaMock.usuarioGalpon.delete).toHaveBeenCalled();
    });

    it('❌ debería rechazar (403) si la asignación no es del propietario', async () => {
      prismaMock.usuarioGalpon.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // TESTS: OBTENER POR USUARIO
  // ============================================================
  describe('obtenerPorUsuario', () => {
    it('✅ debería obtener todas las asignaciones de un usuario', async () => {
      const asignacionesMock = [
        { id: 1, usuario_id: 2, galpon_id: 1 },
        { id: 2, usuario_id: 2, galpon_id: 2 },
      ];
      prismaMock.$transaction.mockResolvedValue([asignacionesMock, 2]);

      const result = await service.obtenerPorUsuario(2, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(asignacionesMock);
      expect(result.meta.total).toBe(2);
    });

    it('❌ debería rechazar (404) si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.obtenerPorUsuario(999, propietario, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // TESTS: OBTENER POR GALPÓN
  // ============================================================
  describe('obtenerPorGalpon', () => {
    it('✅ debería obtener todas las asignaciones de un galpón', async () => {
      const asignacionesMock = [
        { id: 1, usuario_id: 2, galpon_id: 1 },
        { id: 2, usuario_id: 3, galpon_id: 1 },
      ];
      prismaMock.$transaction.mockResolvedValue([asignacionesMock, 2]);

      const result = await service.obtenerPorGalpon(1, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(asignacionesMock);
      expect(result.meta.total).toBe(2);
    });

    it('❌ debería rechazar (403) si el galpón no es del propietario', async () => {
      prismaMock.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: {
          propietario_id: 999,
        },
      });

      await expect(
        service.obtenerPorGalpon(1, propietario, { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
