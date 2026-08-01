import { Test, TestingModule } from '@nestjs/testing';
import { IngestService } from './ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';

describe('IngestService', () => {
  let service: IngestService;

  const prisma = {
    sensor: { findMany: jest.fn() },
    medicion: { create: jest.fn() },
    dispositivo: { update: jest.fn() },
    $transaction: jest.fn(),
  };

  const dispositivo: DispositivoAutenticado = {
    id: 7,
    galpon_id: 3,
    codigo_topic: 'galpon1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<IngestService>(IngestService);

    prisma.$transaction.mockResolvedValue([]);
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
    expect(prisma.medicion.create).toHaveBeenCalledTimes(2);
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
    expect(prisma.medicion.create).toHaveBeenCalledTimes(1);
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
});
