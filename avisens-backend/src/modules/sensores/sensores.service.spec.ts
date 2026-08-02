import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SensoresService } from './sensores.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SensoresService', () => {
  let service: SensoresService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    dispositivo: { findUnique: jest.fn() },
    sensor: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 1,
    dispositivo_id: 10,
    codigo: 'S-1',
    tipo: 'temperatura',
    unidad_medida: '°C',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<SensoresService>(SensoresService);

    prisma.galpon.findUnique.mockResolvedValue({
      id: 1,
      granja: { propietario_id: 5 },
    });
    prisma.dispositivo.findUnique.mockResolvedValue({ id: 10, galpon_id: 1 });
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el sensor cuando galpón y dispositivo son coherentes', async () => {
      prisma.sensor.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, admin);

      expect(prisma.sensor.create).toHaveBeenCalled();
    });

    it('rechaza (400) si el dispositivo pertenece a otro galpón', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ id: 10, galpon_id: 2 });

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el dispositivo no existe', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede crear en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve sensores de sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { galpon: { granja: { propietario_id: 5 } } },
        }),
      );
    });

    it('un Admin ve todos los sensores (sin filtro de dueño)', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el sensor no existe', async () => {
      prisma.sensor.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver un sensor ajeno (403)', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 1, granja: { propietario_id: 999 } },
        dispositivo: { id: 10 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('al mover solo el dispositivo, valida coherencia contra el galpón actual', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 1, granja: { propietario_id: 5 } },
        dispositivo: { id: 5 },
      });
      prisma.dispositivo.findUnique.mockResolvedValue({ id: 9, galpon_id: 2 });

      await expect(
        service.actualizar(1, { dispositivo_id: 9 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });
  });
});
