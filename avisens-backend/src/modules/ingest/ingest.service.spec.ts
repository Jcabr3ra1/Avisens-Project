import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngestService } from './ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';
import { ObservabilityService } from '../../common/observability/observability.service';
import { AlertasService } from '../alertas/alertas.service';

describe('IngestService', () => {
  let service: IngestService;

  const prisma = {
    sensor: { findMany: jest.fn() },
    medicion: { createMany: jest.fn() },
    ingestaDispositivo: { findUnique: jest.fn(), create: jest.fn() },
    dispositivo: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  const observability = { registrarIngesta: jest.fn() };
  const alertas = { evaluarLectura: jest.fn() };

  const dispositivo: DispositivoAutenticado = {
    id: 7,
    galpon_id: 3,
    codigo_topic: 'galpon1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        { provide: PrismaService, useValue: prisma },
        { provide: ObservabilityService, useValue: observability },
        { provide: AlertasService, useValue: alertas },
      ],
    }).compile();
    service = module.get<IngestService>(IngestService);

    prisma.$transaction.mockResolvedValue([]);
    prisma.ingestaDispositivo.findUnique.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  it('registra las lecturas de códigos que son sensores del dispositivo', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      { id: 1, codigo: 'TEMP-G1-01' },
      { id: 2, codigo: 'HUM-G1-01' },
    ]);

    const res = await service.registrar(
      {
        lecturas: [
          { codigo: 'TEMP-G1-01', valor: 24.8 },
          { codigo: 'HUM-G1-01', valor: 69 },
        ],
      },
      dispositivo,
    );

    expect(res.registradas).toBe(2);
    expect(res.ignoradas).toEqual([]);
    const calls = prisma.medicion.createMany.mock.calls as Array<
      [{ data: unknown[] }]
    >;
    const data = calls[0][0].data;
    expect(data).toHaveLength(2);
  });

  it('solo busca sensores del propio dispositivo (alcance)', async () => {
    prisma.sensor.findMany.mockResolvedValue([]);

    await service.registrar(
      { lecturas: [{ codigo: 'X', valor: 1 }] },
      dispositivo,
    );

    const calls = prisma.sensor.findMany.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    expect(calls[0][0].where).toMatchObject({ dispositivo_id: 7 });
  });

  it('ignora (no inserta) las lecturas de código desconocido o ajeno', async () => {
    prisma.sensor.findMany.mockResolvedValue([{ id: 1, codigo: 'TEMP-G1-01' }]);

    const res = await service.registrar(
      {
        lecturas: [
          { codigo: 'TEMP-G1-01', valor: 24.8 },
          { codigo: 'AJENO-99', valor: 50 },
        ],
      },
      dispositivo,
    );

    expect(res.registradas).toBe(1);
    expect(res.ignoradas).toEqual(['AJENO-99']);
    const calls = prisma.medicion.createMany.mock.calls as Array<
      [{ data: unknown[] }]
    >;
    const data = calls[0][0].data;
    expect(data).toHaveLength(1);
  });

  it('marca el dispositivo online (heartbeat) con la IP recibida', async () => {
    prisma.sensor.findMany.mockResolvedValue([{ id: 1, codigo: 'TEMP-G1-01' }]);

    await service.registrar(
      {
        lecturas: [{ codigo: 'TEMP-G1-01', valor: 24.8 }],
        ip_local: '192.168.1.5',
      },
      dispositivo,
    );

    const calls = prisma.dispositivo.update.mock.calls as Array<
      [{ where: { id: number }; data: Record<string, unknown> }]
    >;
    expect(calls[0][0].where.id).toBe(7);
    expect(calls[0][0].data.estado).toBe('online');
    expect(calls[0][0].data.ip_local).toBe('192.168.1.5');
  });

  it('no duplica mediciones cuando se reintenta el mismo id_lote', async () => {
    prisma.ingestaDispositivo.findUnique.mockResolvedValue({
      clave_idempotencia: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
      cantidad_registrada: 2,
      codigos_ignorados: [],
    });

    const res = await service.registrar(
      {
        id_lote: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
        lecturas: [{ codigo: 'TEMP-G1-01', valor: 24.8 }],
      },
      dispositivo,
    );

    expect(res.duplicada).toBe(true);
    expect(prisma.sensor.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe('fallo aislado de evaluarLectura', () => {
    afterEach(() => jest.restoreAllMocks());

    it('un fallo de alertas no rompe la ingesta, y queda registrado aparte', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 1, codigo: 'TEMP-G1-01' },
        { id: 2, codigo: 'HUM-G1-01' },
      ]);
      alertas.evaluarLectura
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fallo simulado'));
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      const res = await service.registrar(
        {
          lecturas: [
            { codigo: 'TEMP-G1-01', valor: 24.8 },
            { codigo: 'HUM-G1-01', valor: 69 },
          ],
        },
        dispositivo,
      );

      expect(res.registradas).toBe(2);
      expect(Object.keys(res)).toEqual([
        'id_lote',
        'duplicada',
        'registradas',
        'ignoradas',
      ]);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [linea] = errorSpy.mock.calls[0] as [string];
      const registro = JSON.parse(linea) as Record<string, unknown>;
      expect(registro.evento).toBe('iot.alerta.fallida');
      expect(registro.mediciones_guardadas).toBe(2);
      expect(registro.alertas_fallidas).toBe(1);
      expect(registro.sensores).toEqual([2]);
      expect(registro.clasificacion).toEqual({ desconocida: 1 });
    });

    it('sin fallos, no emite la línea de alerta fallida', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 1, codigo: 'TEMP-G1-01' },
      ]);
      alertas.evaluarLectura.mockResolvedValue(undefined);
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await service.registrar(
        { lecturas: [{ codigo: 'TEMP-G1-01', valor: 24.8 }] },
        dispositivo,
      );

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
