import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasService } from '../alertas/alertas.service';

describe('MedicionesService', () => {
  let service: MedicionesService;

  const prisma = {
    sensor: { findUnique: jest.fn() },
    medicion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const alertas = { evaluarLectura: jest.fn() };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoRegistrar = { sensor_id: 1, valor: 27.5 };

  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AlertasService, useValue: alertas },
      ],
    }).compile();
    service = module.get<MedicionesService>(MedicionesService);

    prisma.sensor.findUnique.mockResolvedValue({
      id: 1,
      galpon: { granja: { propietario_id: 5 } },
    });
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('registrar', () => {
    it('registra la medición cuando el sensor es válido', async () => {
      prisma.medicion.create.mockResolvedValue({ id: 1 });

      await service.registrar(dtoRegistrar, admin);

      expect(prisma.medicion.create).toHaveBeenCalled();
      expect(alertas.evaluarLectura).toHaveBeenCalledWith(1, 27.5, undefined);
    });

    it('un Propietario no puede registrar en un sensor ajeno (403)', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.registrar(dtoRegistrar, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.medicion.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el sensor no existe', async () => {
      prisma.sensor.findUnique.mockResolvedValue(null);

      await expect(service.registrar(dtoRegistrar, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.medicion.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('arma el rango de fechas (gte/lte) cuando se pasan desde y hasta', async () => {
      const desde = '2026-07-01T00:00:00Z';
      const hasta = '2026-07-31T23:59:59Z';

      await service.listar({ desde, hasta, page: 1, limit: 10 }, admin);

      expect(whereDe(prisma.medicion.findMany).fecha_hora).toEqual({
        gte: new Date(desde),
        lte: new Date(hasta),
      });
    });

    it('no filtra por fecha cuando no se pasa ni desde ni hasta', async () => {
      await service.listar({ page: 1, limit: 10 }, admin);

      expect(whereDe(prisma.medicion.findMany).fecha_hora).toBeUndefined();
    });

    it('un Propietario solo ve mediciones de sus sensores', async () => {
      await service.listar({ page: 1, limit: 10 }, propietario);

      expect(whereDe(prisma.medicion.findMany).sensor).toEqual({
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar({ page: 1, limit: 10 }, admin);

      expect(whereDe(prisma.medicion.findMany).sensor).toBeUndefined();
    });

    it('al filtrar por un sensor ajeno, un Propietario recibe 403 y no consulta', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 2,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.listar({ sensor_id: 2, page: 1, limit: 10 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.medicion.findMany).not.toHaveBeenCalled();
    });
  });
});
