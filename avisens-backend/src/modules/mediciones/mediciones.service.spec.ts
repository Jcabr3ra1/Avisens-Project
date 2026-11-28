import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasService } from '../alertas/alertas.service';

describe('MedicionesService', () => {
  let service: MedicionesService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    zonaGalpon: { findMany: jest.fn() },
    lote: { findFirst: jest.fn() },
    umbralAmbiental: { findMany: jest.fn() },
    sensor: { findUnique: jest.fn(), findMany: jest.fn() },
    medicion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
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

    describe('fallo aislado de evaluarLectura', () => {
      afterEach(() => jest.restoreAllMocks());

      it('un fallo de alertas no rompe el registro, agrega advertencia y queda registrado aparte', async () => {
        prisma.medicion.create.mockResolvedValue({ id: 7 });
        alertas.evaluarLectura.mockRejectedValue(new Error('fallo simulado'));
        const errorSpy = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation();

        const res = await service.registrar(dtoRegistrar, admin);

        expect(res).toEqual({
          id: 7,
          advertencia_evaluacion:
            'No se pudo completar el procesamiento de alertas para esta lectura',
        });

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [linea] = errorSpy.mock.calls[0] as [string];
        const registro = JSON.parse(linea) as Record<string, unknown>;
        expect(registro.evento).toBe('mediciones.alerta.fallida');
        expect(registro.medicion_id).toBe('7');
        expect(registro.sensor_id).toBe(1);
        expect(registro.clasificacion).toBe('desconocida');
      });

      it('sin fallos, no agrega advertencia ni emite log', async () => {
        prisma.medicion.create.mockResolvedValue({ id: 8 });
        alertas.evaluarLectura.mockResolvedValue({ id: 99 });
        const errorSpy = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation();

        const res = await service.registrar(dtoRegistrar, admin);

        expect(res).toEqual({ id: 8 });
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('cuando evaluarLectura devuelve null, tampoco agrega advertencia', async () => {
        prisma.medicion.create.mockResolvedValue({ id: 9 });
        alertas.evaluarLectura.mockResolvedValue(null);
        const errorSpy = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation();

        const res = await service.registrar(dtoRegistrar, admin);

        expect(res).toEqual({ id: 9 });
        expect(errorSpy).not.toHaveBeenCalled();
      });
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

  describe('historico', () => {
    const queryBase = {
      galpon_id: 1,
      variable: 'temperatura' as const,
      desde: '2026-10-01T00:00:00.000Z',
      hasta: '2026-11-27T23:59:59.999Z',
    };

    beforeEach(() => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Galpón Norte',
        codigo: 'G-01',
        granja: { nombre: 'Granja Sol', propietario_id: 5 },
      });
      prisma.zonaGalpon.findMany.mockResolvedValue([
        { id: 10, nombre: 'Zona A', codigo: 'ZA' },
      ]);
      prisma.sensor.findMany.mockResolvedValue([
        { id: 3, tipo: 'temperatura', unidad_medida: '°C' },
        { id: 4, tipo: 'humedad', unidad_medida: '%' },
      ]);
      prisma.lote.findFirst.mockResolvedValue({
        fecha_ingreso: new Date('2026-10-15T00:00:00.000Z'),
      });
      prisma.umbralAmbiental.findMany.mockResolvedValue([
        { semana_vida: 0, valor_minimo: 30, valor_maximo: 33 },
        { semana_vida: 1, valor_minimo: 28, valor_maximo: 30 },
      ]);
      prisma.medicion.aggregate.mockResolvedValue({
        _min: { fecha_hora: new Date('2026-09-10T00:00:00.000Z') },
        _max: { fecha_hora: new Date('2026-11-27T12:00:00.000Z') },
      });
    });

    it('rechaza (400) cuando el rango supera 12 meses', async () => {
      await expect(
        service.historico(
          {
            ...queryBase,
            desde: '2025-01-01T00:00:00.000Z',
            hasta: '2026-11-27T23:59:59.999Z',
          },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza (400) cuando desde es mayor que hasta', async () => {
      await expect(
        service.historico(
          {
            ...queryBase,
            desde: '2026-11-27T00:00:00.000Z',
            hasta: '2026-11-01T00:00:00.000Z',
          },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza (403) si el propietario no es dueño del galpón', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Galpón Ajeno',
        codigo: 'G-99',
        granja: { nombre: 'Otra', propietario_id: 999 },
      });

      await expect(service.historico(queryBase, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('retorna serie agregada con línea objetivo por semana de vida y resumen', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2026-10-16T05:00:00.000Z'),
          promedio: 31.2,
          minimo: 30.1,
          maximo: 32.4,
          lecturas: 24,
        },
        {
          bucket: new Date('2026-10-25T05:00:00.000Z'),
          promedio: 32.5,
          minimo: 31.0,
          maximo: 33.8,
          lecturas: 12,
        },
      ]);

      const res = await service.historico(queryBase, propietario);

      expect(res.sin_datos).toBe(false);
      expect(res.granularidad).toBe('dia');
      expect(res.unidad_medida).toBe('°C');
      expect(res.serie).toHaveLength(2);
      expect(res.serie[0]).toMatchObject({
        promedio: 31.2,
        objetivo_min: 30,
        objetivo_max: 33,
      });
      expect(res.serie[1]).toMatchObject({
        promedio: 32.5,
        objetivo_min: 28,
        objetivo_max: 30,
      });
      expect(res.resumen.total_lecturas).toBe(36);
      expect(res.resumen.puntos_fuera_de_rango).toBe(1);
    });

    it('devuelve mensaje y rango sugerido cuando el rango no tiene registros', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const res = await service.historico(
        {
          ...queryBase,
          desde: '2025-12-01T00:00:00.000Z',
          hasta: '2026-01-15T00:00:00.000Z',
        },
        propietario,
      );

      expect(res.sin_datos).toBe(true);
      expect(res.mensaje).toBe('No existen registros para el rango seleccionado');
      expect(res.rango_sugerido).not.toBeNull();
      expect(res.serie).toEqual([]);
    });
  });
});
