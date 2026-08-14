import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IndicadoresService } from './indicadores.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IndicadoresService · calcularParaLote', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findFirst: jest.fn() },
    consumoDiario: { aggregate: jest.fn() },
    registroMortalidad: { aggregate: jest.fn() },
    indicadorLote: { upsert: jest.fn() },
  };

  const guardadoDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ create: Record<string, unknown> }]
    >;
    return calls[0][0].create;
  };

  const hace = (dias: number) =>
    new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
    prisma.indicadorLote.upsert.mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('calcula el FCR y la mortalidad de un lote con datos', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      fecha_ingreso: hace(21),
      cantidad_inicial: 1000,
      sexo: 'macho',
    });
    prisma.pesaje.findFirst.mockResolvedValue({ peso_promedio_g: 1000 });
    prisma.consumoDiario.aggregate.mockResolvedValue({
      _sum: { alimento_kg: 1150 },
    });
    prisma.registroMortalidad.aggregate.mockResolvedValue({
      _sum: { cantidad_aves: 30 },
    });

    await service.calcularParaLote(1);

    const guardado = guardadoDe(prisma.indicadorLote.upsert);
    expect(guardado.fcr as number).toBeCloseTo(1.24, 1);
    expect(guardado.mortalidad_acumulada_pct as number).toBeCloseTo(3, 1);
    expect(guardado.peso_promedio_g).toBe(1000);
  });

  it('deja el FCR en null cuando el lote no tiene pesajes', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      fecha_ingreso: hace(10),
      cantidad_inicial: 1000,
      sexo: 'macho',
    });
    prisma.pesaje.findFirst.mockResolvedValue(null);
    prisma.consumoDiario.aggregate.mockResolvedValue({
      _sum: { alimento_kg: 500 },
    });
    prisma.registroMortalidad.aggregate.mockResolvedValue({
      _sum: { cantidad_aves: 0 },
    });

    await service.calcularParaLote(1);

    const guardado = guardadoDe(prisma.indicadorLote.upsert);
    expect(guardado.fcr).toBeNull();
  });

  it('lanza NotFound cuando el lote no existe', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);
    await expect(service.calcularParaLote(99)).rejects.toThrow(
      NotFoundException,
    );
  });
});
