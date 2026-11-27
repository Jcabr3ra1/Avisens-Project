import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClimaService } from './clima.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('ClimaService', () => {
  let service: ClimaService;

  const prisma = {
    granja: {
      findUnique: jest.fn(),
    },
    clima: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClimaService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ClimaService>(ClimaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listar', () => {
    it('lanza NotFound cuando la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);
      await expect(service.listar(99, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.clima.findMany).not.toHaveBeenCalled();
    });

    it('lanza Forbidden cuando el propietario no es dueno de la granja', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: 999,
      });
      await expect(service.listar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.clima.findMany).not.toHaveBeenCalled();
    });

    it('devuelve las lecturas cuando el propietario es dueno', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: propietario.id,
      });
      prisma.clima.findMany.mockResolvedValue([{ id: 10 }]);
      const r = await service.listar(1, propietario);
      expect(r).toEqual([{ id: 10 }]);
      expect(prisma.clima.findMany).toHaveBeenCalledWith({
        where: { granja_id: 1 },
        orderBy: { fecha_hora: 'desc' },
        take: 48,
      });
    });

    it('el admin ve el clima de cualquier granja', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: 999,
      });
      prisma.clima.findMany.mockResolvedValue([]);
      await expect(service.listar(1, admin)).resolves.toEqual([]);
    });
  });

  describe('traerClimaDeGranja', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('devuelve null cuando la granja no tiene coordenadas', async () => {
      const r = await service.traerClimaDeGranja({
        id: 1,
        latitud: null,
        longitud: null,
      });
      expect(r).toBeNull();
      expect(prisma.clima.create).not.toHaveBeenCalled();
    });

    it('devuelve null cuando Open-Meteo responde con error', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      const r = await service.traerClimaDeGranja({
        id: 1,
        latitud: 6.2,
        longitud: -75.5,
      });
      expect(r).toBeNull();
      expect(prisma.clima.create).not.toHaveBeenCalled();
    });

    it('guarda el clima mapeando los campos de Open-Meteo', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          current: {
            temperature_2m: 23.1,
            relative_humidity_2m: 60,
            wind_speed_10m: 6,
            precipitation: 0,
          },
        }),
      });
      prisma.clima.create.mockResolvedValue({ id: 1 });

      await service.traerClimaDeGranja({
        id: 3,
        latitud: 6.2,
        longitud: -75.5,
      });

      expect(prisma.clima.create).toHaveBeenCalledWith({
        data: {
          granja_id: 3,
          temperatura: 23.1,
          humedad: 60,
          viento_kmh: 6,
          precipitacion: 0,
          fuente: 'open-meteo',
        },
      });
    });
  });

  describe('traerAhora', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('lanza NotFound cuando la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);
      await expect(service.traerAhora(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden cuando el propietario no es dueno', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: 999,
        latitud: 6.2,
        longitud: -75.5,
      });
      await expect(service.traerAhora(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequest cuando no se pudo traer el clima', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: admin.id,
        latitud: 6.2,
        longitud: -75.5,
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      await expect(service.traerAhora(1, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devuelve la lectura cuando el fetch fue exitoso', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: admin.id,
        latitud: 6.2,
        longitud: -75.5,
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ current: { temperature_2m: 25 } }),
      });
      prisma.clima.create.mockResolvedValue({ id: 7, temperatura: 25 });
      const r = await service.traerAhora(1, admin);
      expect(r).toEqual({ id: 7, temperatura: 25 });
    });
  });
});
