import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClimaService } from './clima.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

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

  const config = {
    get: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClimaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
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

    it('devuelve null sin OPENWEATHER_KEY', async () => {
      config.get.mockReturnValue(undefined);
      const r = await service.traerClimaDeGranja({
        id: 1,
        latitud: 6.2,
        longitud: -75.5,
      });
      expect(r).toBeNull();
      expect(prisma.clima.create).not.toHaveBeenCalled();
    });

    it('devuelve null cuando la granja no tiene coordenadas', async () => {
      config.get.mockReturnValue('api-key');
      const r = await service.traerClimaDeGranja({
        id: 1,
        latitud: null,
        longitud: null,
      });
      expect(r).toBeNull();
      expect(prisma.clima.create).not.toHaveBeenCalled();
    });

    it('devuelve null cuando OpenWeather responde con error', async () => {
      config.get.mockReturnValue('api-key');
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      const r = await service.traerClimaDeGranja({
        id: 1,
        latitud: 6.2,
        longitud: -75.5,
      });
      expect(r).toBeNull();
      expect(prisma.clima.create).not.toHaveBeenCalled();
    });

    it('guarda el clima y convierte el viento de m/s a km/h', async () => {
      config.get.mockReturnValue('api-key');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          main: { temp: 28.5, humidity: 70 },
          wind: { speed: 10 },
          rain: { '1h': 2.5 },
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
          temperatura: 28.5,
          humedad: 70,
          viento_kmh: 36,
          precipitacion: 2.5,
          fuente: 'openweather',
        },
      });
    });
  });
});
