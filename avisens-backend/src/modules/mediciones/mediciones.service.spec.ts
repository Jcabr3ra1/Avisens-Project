import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasService } from '../alertas/alertas.service';

describe('MedicionesService', () => {
  let service: MedicionesService;

  const prisma = {
    sensor: { findUnique: jest.fn(), findMany: jest.fn() },
    medicion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
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

  describe('ultimasPorSensores', () => {
    const sensorSelect = (id: number, galpon_id = 3) => ({
      id,
      galpon_id,
      codigo: `SENSOR-${id}`,
      tipo: 'temperatura',
      unidad_medida: 'C',
      estado: 'activo',
    });

    it('devuelve una entrada por sensor del alcance, con null en los que nunca reportaron', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        sensorSelect(1),
        sensorSelect(2),
      ]);
      const fecha = new Date('2026-09-12T10:00:00.000Z');
      prisma.$queryRaw.mockResolvedValue([
        { sensor_id: 1, valor: 24.8, fecha_hora: fecha, calidad: 'ok' },
        { sensor_id: 2, valor: null, fecha_hora: null, calidad: null },
      ]);

      const resultado = await service.ultimasPorSensores(admin);

      expect(resultado.sensores).toHaveLength(2);
      expect(
        resultado.sensores.find((s) => s.sensor_id === 1)?.ultima_lectura,
      ).toMatchObject({ valor: 24.8, fecha_hora: fecha, calidad: 'ok' });
      expect(
        resultado.sensores.find((s) => s.sensor_id === 2)?.ultima_lectura,
      ).toBeNull();
    });

    it('calcula antiguedad_segundos de cada sensor contra el mismo instante generado_en', async () => {
      // Dos lecturas a offsets conocidos y distintos: si las dos usaran
      // instantes distintos de "ahora", la diferencia entre sus antigüedades
      // se alejaría de los 20s reales sin importar cuánto tarde el test.
      const hace30s = new Date(Date.now() - 30_000);
      const hace10s = new Date(Date.now() - 10_000);
      prisma.sensor.findMany.mockResolvedValue([
        sensorSelect(1),
        sensorSelect(2),
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { sensor_id: 1, valor: 20, fecha_hora: hace30s, calidad: 'ok' },
        { sensor_id: 2, valor: 21, fecha_hora: hace10s, calidad: 'ok' },
      ]);

      const resultado = await service.ultimasPorSensores(admin);

      const antiguedad1 = resultado.sensores.find((s) => s.sensor_id === 1)
        ?.ultima_lectura?.antiguedad_segundos as number;
      const antiguedad2 = resultado.sensores.find((s) => s.sensor_id === 2)
        ?.ultima_lectura?.antiguedad_segundos as number;

      expect(antiguedad1 - antiguedad2).toBeGreaterThanOrEqual(19);
      expect(antiguedad1 - antiguedad2).toBeLessThanOrEqual(21);
    });

    it('los ids que llegan al SQL crudo salen del findMany ya filtrado, no del cliente', async () => {
      prisma.sensor.findMany.mockResolvedValue([sensorSelect(7)]);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.ultimasPorSensores(propietario);

      const llamadas = prisma.$queryRaw.mock.calls as Array<
        [{ values: unknown[] }]
      >;
      expect(llamadas[0][0].values).toEqual([7]);
    });

    it('Administrador: filtroSensores da undefined y el AND no se rompe', async () => {
      prisma.sensor.findMany.mockResolvedValue([]);

      const resultado = await service.ultimasPorSensores(admin);

      expect(resultado.sensores).toEqual([]);
      const where = whereDe(prisma.sensor.findMany) as {
        AND: [Record<string, unknown>, Record<string, unknown>];
      };
      expect(where.AND[0]).toEqual({});
    });

    it('un galpón ajeno en galpon_id se agrega al AND, no sustituye el alcance (no es un 403)', async () => {
      prisma.sensor.findMany.mockResolvedValue([]);

      const resultado = await service.ultimasPorSensores(propietario, [999]);

      expect(resultado.sensores).toEqual([]);
      const where = whereDe(prisma.sensor.findMany) as {
        AND: [Record<string, unknown>, Record<string, unknown>];
      };
      expect(where.AND[1]).toEqual({ galpon_id: { in: [999] } });
    });

    it('si el alcance no tiene sensores, no ejecuta el SQL crudo', async () => {
      prisma.sensor.findMany.mockResolvedValue([]);

      const resultado = await service.ultimasPorSensores(admin);

      expect(resultado.sensores).toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('rechaza (400) cuando el alcance supera los 500 sensores', async () => {
      const muchos = Array.from({ length: 501 }, (_, i) => sensorSelect(i + 1));
      prisma.sensor.findMany.mockResolvedValue(muchos);

      await expect(service.ultimasPorSensores(admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('pide como máximo 501 filas al findMany, para no cargar el alcance completo solo para descartarlo', async () => {
      prisma.sensor.findMany.mockResolvedValue([sensorSelect(1)]);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.ultimasPorSensores(admin);

      const llamadas = prisma.sensor.findMany.mock.calls as Array<
        [{ take: number }]
      >;
      expect(llamadas[0][0].take).toBe(501);
    });
  });
});
