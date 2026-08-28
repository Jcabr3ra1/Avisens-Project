// zonas-galpon.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ZonasGalponService } from './zonas-galpon.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ZonasGalponService', () => {
  let service: ZonasGalponService;

  // Mock de Prisma
  const prismaMock = {
    zonaGalpon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    galpon_id: 1,
    codigo: 'ZONA-01',
    nombre: 'Zona de alimentación',
    tipo_zona: 'produccion',
    coordenada_x_inicio: 0,
    coordenada_y_inicio: 0,
    coordenada_x_fin: 10,
    coordenada_y_fin: 10,
    color_visualizacion: '#FF5733',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonasGalponService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ZonasGalponService>(ZonasGalponService);

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

    // Defaults
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

    prismaMock.zonaGalpon.findUnique.mockResolvedValue({
      id: 1,
      galpon_id: 1,
      codigo: 'ZONA-01',
      nombre: 'Zona de alimentación',
      tipo_zona: 'produccion',
      coordenada_x_inicio: 0,
      coordenada_y_inicio: 0,
      coordenada_x_fin: 10,
      coordenada_y_fin: 10,
      color_visualizacion: '#FF5733',
      activa: true,
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
      sensores: [],
      equipos: [],
    });

    // Para listar
    prismaMock.zonaGalpon.count.mockResolvedValue(0);
    prismaMock.zonaGalpon.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TESTS: CREAR
  // ============================================================
  describe('crear', () => {
    it('✅ debería crear una zona correctamente', async () => {
      prismaMock.zonaGalpon.create.mockResolvedValue({
        id: 1,
        ...dtoCrear,
        activa: true,
      });

      const result = await service.crear(dtoCrear, propietario);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaMock.zonaGalpon.create).toHaveBeenCalled();
    });

    it('✅ debería usar activa = true por defecto', async () => {
      const dtoSinActiva = { ...dtoCrear };
      delete dtoSinActiva.activa;

      prismaMock.zonaGalpon.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinActiva, propietario);

      expect(prismaMock.zonaGalpon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activa: true,
          }),
        }),
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

    it('❌ debería rechazar (400) si ya existe una zona con el mismo código en el galpón', async () => {
      prismaMock.zonaGalpon.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TESTS: LISTAR
  // ============================================================
  describe('listar', () => {
    it('✅ Propietario: solo ve zonas de sus galpones', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prismaMock.zonaGalpon.findMany).toHaveBeenCalledWith(
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

    it('✅ Admin: ve todas las zonas', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prismaMock.zonaGalpon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('✅ debería paginar correctamente', async () => {
      await service.listar(admin, { page: 2, limit: 5 });

      expect(prismaMock.zonaGalpon.findMany).toHaveBeenCalledWith(
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
    it('✅ debería obtener una zona por ID', async () => {
      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaMock.zonaGalpon.findUnique).toHaveBeenCalled();
    });

    it('❌ debería rechazar (404) si la zona no existe', async () => {
      prismaMock.zonaGalpon.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('❌ debería rechazar (403) si la zona no es del propietario', async () => {
      prismaMock.zonaGalpon.findUnique.mockResolvedValue({
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
    it('✅ debería actualizar una zona', async () => {
      const dto = { nombre: 'Zona actualizada' };
      prismaMock.zonaGalpon.update.mockResolvedValue({
        id: 1,
        ...dto,
      });

      const result = await service.actualizar(1, dto, propietario);

      expect(result).toBeDefined();
      expect(prismaMock.zonaGalpon.update).toHaveBeenCalled();
    });

    it('✅ debería retornar la zona si no hay datos para actualizar', async () => {
      const dto = {};
      const result = await service.actualizar(1, dto, propietario);

      expect(result).toBeDefined();
      expect(prismaMock.zonaGalpon.update).not.toHaveBeenCalled();
    });

    it('❌ debería rechazar (403) si la zona no es del propietario', async () => {
      prismaMock.zonaGalpon.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: {
            propietario_id: 999,
          },
        },
      });

      await expect(
        service.actualizar(1, { nombre: 'Nuevo nombre' }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // TESTS: ACTIVAR / DESACTIVAR
  // ============================================================
  describe('activar / desactivar', () => {
    it('✅ debería activar una zona', async () => {
      prismaMock.zonaGalpon.update.mockResolvedValue({
        id: 1,
        activa: true,
      });

      const result = await service.activar(1, propietario);

      expect(result.activa).toBe(true);
      expect(prismaMock.zonaGalpon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { activa: true },
        }),
      );
    });

    it('✅ debería desactivar una zona', async () => {
      prismaMock.zonaGalpon.update.mockResolvedValue({
        id: 1,
        activa: false,
      });

      const result = await service.desactivar(1, propietario);

      expect(result.activa).toBe(false);
      expect(prismaMock.zonaGalpon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { activa: false },
        }),
      );
    });

    it('❌ debería rechazar (403) si la zona no es del propietario', async () => {
      prismaMock.zonaGalpon.findUnique.mockResolvedValue({
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
    it('✅ debería eliminar una zona', async () => {
      prismaMock.zonaGalpon.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, propietario);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prismaMock.zonaGalpon.delete).toHaveBeenCalled();
    });

    it('❌ debería rechazar (403) si la zona no es del propietario', async () => {
      prismaMock.zonaGalpon.findUnique.mockResolvedValue({
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
  // TESTS: OBTENER POR GALPÓN
  // ============================================================
  describe('obtenerPorGalpon', () => {
    it('✅ debería obtener todas las zonas de un galpón', async () => {
      const zonasMock = [
        { id: 1, nombre: 'Zona 1' },
        { id: 2, nombre: 'Zona 2' },
      ];
      prismaMock.$transaction.mockResolvedValue([zonasMock, 2]);

      const result = await service.obtenerPorGalpon(1, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(zonasMock);
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
