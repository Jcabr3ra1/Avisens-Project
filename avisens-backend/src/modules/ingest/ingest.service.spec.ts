import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngestService } from './ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';
import { ObservabilityService } from '../../common/observability/observability.service';
import { AlertasService } from '../alertas/alertas.service';
import { OrdenesActuadoresService } from '../ordenes-actuadores/ordenes-actuadores.service';
import { FirmwareService } from '../firmware/firmware.service';

describe('IngestService', () => {
  let service: IngestService;

  const prisma = {
    sensor: { findMany: jest.fn() },
    medicion: { createMany: jest.fn() },
    ingestaDispositivo: { findUnique: jest.fn(), create: jest.fn() },
    dispositivo: { update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const observability = { registrarIngesta: jest.fn() };
  const alertas = { evaluarLectura: jest.fn() };
  const ordenes = {
    procesarReporte: jest.fn(),
    entregarPendientes: jest.fn(),
  };
  const firmware = { vigente: jest.fn().mockResolvedValue(null) };

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
        { provide: OrdenesActuadoresService, useValue: ordenes },
        { provide: FirmwareService, useValue: firmware },
      ],
    }).compile();
    service = module.get<IngestService>(IngestService);

    prisma.$transaction.mockResolvedValue([]);
    prisma.ingestaDispositivo.findUnique.mockResolvedValue(null);
    ordenes.procesarReporte.mockResolvedValue('actual');
    ordenes.entregarPendientes.mockResolvedValue([]);
  });

  const ARRANQUE = '0b6f8a52-3c1e-4d7a-9f20-6a1d2b3c4e5f';

  describe('órdenes remotas de actuadores', () => {
    it('procesa las confirmaciones del ciclo y entrega las pendientes en la respuesta', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 1, codigo: 'REL-K2-G1-01' },
      ]);
      ordenes.entregarPendientes.mockResolvedValue([
        { id: 42, codigo: 'REL-K2-G1-01', accion: 'encender' },
      ]);
      const resultados = [
        { orden_id: 41, resultado: 'aplicada' as const, estado_rele: true },
      ];

      const estados = [
        {
          codigo: 'REL-K2-G1-01',
          modo: 'manual_remoto' as const,
          encendido: true,
          orden_id: 41,
        },
      ];

      const res = await service.registrar(
        {
          arranque_id: ARRANQUE,
          lecturas: [{ codigo: 'REL-K2-G1-01', valor: 1 }],
          resultados_ordenes: resultados,
          estados_reles: estados,
        },
        dispositivo,
      );

      expect(ordenes.procesarReporte).toHaveBeenCalledWith(
        7,
        resultados,
        estados,
        ARRANQUE,
      );
      expect(ordenes.entregarPendientes).toHaveBeenCalledWith(7, ARRANQUE);
      expect(res.ordenes).toEqual([
        { id: 42, codigo: 'REL-K2-G1-01', accion: 'encender' },
      ]);
    });

    it('un reintento del mismo id_lote también entrega las órdenes pendientes', async () => {
      prisma.ingestaDispositivo.findUnique.mockResolvedValue({
        clave_idempotencia: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
        cantidad_registrada: 1,
        codigos_ignorados: [],
      });
      ordenes.entregarPendientes.mockResolvedValue([
        { id: 42, codigo: 'REL-K2-G1-01', accion: 'apagar' },
      ]);

      const res = await service.registrar(
        {
          id_lote: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
          lecturas: [{ codigo: 'REL-K2-G1-01', valor: 1 }],
        },
        dispositivo,
      );

      expect(res.duplicada).toBe(true);
      expect(res.ordenes).toHaveLength(1);
    });

    it('un envío retrasado de la sesión anterior al reinicio no recibe órdenes', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 1, codigo: 'REL-K2-G1-01' },
      ]);
      ordenes.procesarReporte.mockResolvedValue('anterior');

      const res = await service.registrar(
        {
          arranque_id: ARRANQUE,
          lecturas: [{ codigo: 'REL-K2-G1-01', valor: 1 }],
        },
        dispositivo,
      );

      expect(ordenes.entregarPendientes).not.toHaveBeenCalled();
      expect(res.ordenes).toEqual([]);
      // Las mediciones del envío se guardan igual: solo se le niegan órdenes.
      expect(res.registradas).toBe(1);
    });

    it('si las órdenes fallan, la ingesta igual responde con las mediciones guardadas', async () => {
      const errorLog = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      prisma.sensor.findMany.mockResolvedValue([
        { id: 1, codigo: 'TEMP-G1-01' },
      ]);
      ordenes.procesarReporte.mockRejectedValue(new Error('bd caída'));

      const res = await service.registrar(
        { lecturas: [{ codigo: 'TEMP-G1-01', valor: 24.8 }] },
        dispositivo,
      );

      expect(res.registradas).toBe(1);
      expect(res.ordenes).toEqual([]);
      expect(errorLog).toHaveBeenCalledWith(
        expect.stringContaining('iot.ordenes.fallida'),
      );
      errorLog.mockRestore();
    });
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

  it('guarda la calidad que envía el ESP32: el peso sin calibrar llega "sospechosa"', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      { id: 3, codigo: 'GAS-G1-01' },
      { id: 4, codigo: 'PESO-G1-01' },
    ]);

    const res = await service.registrar(
      {
        lecturas: [
          { codigo: 'GAS-G1-01', valor: 912 },
          { codigo: 'PESO-G1-01', valor: 812.5, calidad: 'sospechosa' },
        ],
      },
      dispositivo,
    );

    expect(res.registradas).toBe(2);
    const calls = prisma.medicion.createMany.mock.calls as Array<
      [{ data: Array<{ sensor_id: number; calidad?: string }> }]
    >;
    const data = calls[0][0].data;
    expect(data.find((m) => m.sensor_id === 3)?.calidad).toBeUndefined();
    expect(data.find((m) => m.sensor_id === 4)?.calidad).toBe('sospechosa');
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

  it('resuelve tipo y GPIO al serial asignado sin que el firmware lo conozca', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      {
        id: 35,
        codigo: 'SERIAL-AUTOMATICO',
        tipo: 'temperatura',
        canal: 'gpio:18',
      },
      { id: 36, codigo: 'OTRO-SERIAL', tipo: 'temperatura', canal: 'gpio:4' },
    ]);
    const res = await service.registrar(
      {
        lecturas: [
          { tipo: 'temperatura', canal: 'gpio:18', valor: 24.8 },
          { tipo: 'humedad', canal: 'gpio:18', valor: 60 },
        ],
      },
      dispositivo,
    );
    expect(res.registradas).toBe(1);
    expect(res.ignoradas).toEqual(['humedad:gpio:18']);
    expect(prisma.sensor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dispositivo_id: 7, galpon_id: 3, estado: 'activo' },
      }),
    );
    expect(prisma.medicion.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sensor_id: 35, valor: 24.8 })],
    });
  });

  it('no asigna por tipo una conexión distinta o todavía sin vincular', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      { id: 35, codigo: 'SIN-VINCULAR', tipo: 'temperatura', canal: null },
      { id: 36, codigo: 'OTRO-GPIO', tipo: 'temperatura', canal: 'gpio:4' },
    ]);
    const res = await service.registrar(
      { lecturas: [{ tipo: 'temperatura', canal: 'gpio:18', valor: 24.8 }] },
      dispositivo,
    );
    expect(res.registradas).toBe(0);
  });

  it('rechaza un mismo sensor enviado por serial y conexión en el mismo lote', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      { id: 35, codigo: 'SERIAL', tipo: 'temperatura', canal: 'gpio:18' },
    ]);
    await expect(
      service.registrar(
        {
          lecturas: [
            { codigo: 'SERIAL', valor: 24.8 },
            { tipo: 'temperatura', canal: 'gpio:18', valor: 24.8 },
          ],
        },
        dispositivo,
      ),
    ).rejects.toThrow('Un sensor no puede aparecer dos veces');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('publica conexiones DHT22 sin secretos, sin inventar sensores y sin duplicar GPIO', async () => {
    prisma.sensor.findMany.mockResolvedValue([
      { tipo: 'temperatura', canal: 'gpio:18', modelo: 'DHT22' },
      { tipo: 'humedad', canal: 'gpio:18', modelo: 'DHT22' },
      { tipo: 'co2', canal: 'gpio:4', modelo: 'MQ135' },
      { tipo: 'temperatura', canal: 'gpio:34', modelo: 'DHT22' },
    ]);
    expect(await service.configuracion(dispositivo)).toEqual({
      version: 1,
      controlador: 'galpon1',
      conexiones: [{ canal: 'gpio:18', modelo: 'DHT22', gpio: 18 }],
      firmware: null,
    });
    expect(prisma.sensor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dispositivo_id: 7,
          galpon_id: 3,
          estado: 'activo',
          canal: { not: null },
        },
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ofrece el firmware publicado y registra la versión que reporta el controlador', async () => {
    prisma.sensor.findMany.mockResolvedValue([]);
    firmware.vigente.mockResolvedValueOnce({
      version: '1.2.0',
      sha256: 'abc',
      tamano: 900000,
    });

    const r = await service.configuracion(dispositivo, '1.1.0');

    expect(r.firmware).toEqual({
      version: '1.2.0',
      sha256: 'abc',
      tamano: 900000,
    });
    expect(prisma.dispositivo.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        OR: [
          { version_firmware: null },
          { version_firmware: { not: '1.1.0' } },
        ],
      },
      data: { version_firmware: '1.1.0' },
    });
  });

  it('ignora una versión de firmware con caracteres raros', async () => {
    prisma.sensor.findMany.mockResolvedValue([]);

    await service.configuracion(dispositivo, 'x; drop table');

    expect(prisma.dispositivo.updateMany).not.toHaveBeenCalled();
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
        'ordenes',
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
