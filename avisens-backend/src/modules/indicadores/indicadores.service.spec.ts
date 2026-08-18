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
    indicadorLote: { upsert: jest.fn(), findFirst: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
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

describe('IndicadoresService · compararConCurva', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    indicadorLote: { findFirst: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
  };

  const admin = { id: 1, rol: 'Administrador' };

  const loteConDueno = {
    galpon: { granja: { propietario_id: 1 } },
    sexo: 'macho',
    marca_alimento: 'italcol',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
  });

  afterEach(() => jest.clearAllMocks());

  it('lanza NotFound cuando no hay indicadores calculados', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(null);
    await expect(service.compararConCurva(1, admin)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('devuelve sin_referencia cuando no hay curva para la marca y sexo', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue({
      dia_vida: 21,
      peso_promedio_g: 1000,
      fcr: 1.2,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue(null);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('sin_referencia');
    expect(r.objetivo).toBeNull();
  });

  it('veredicto por_debajo cuando el peso real esta bajo la curva', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue({
      dia_vida: 21,
      peso_promedio_g: 900,
      fcr: 1.3,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue({
      dia: 21,
      peso_esperado_g: 1035,
      fcr_objetivo: 1.18,
    });

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('por_debajo');
    expect(r.desvio_peso_pct as number).toBeCloseTo(-13.04, 1);
    expect(r.desvio_fcr as number).toBeCloseTo(0.12, 2);
    expect(r.real).toEqual({ peso_promedio_g: 900, fcr: 1.3 });
    expect(r.objetivo).toEqual({ peso_esperado_g: 1035, fcr_objetivo: 1.18 });
  });

  it('veredicto en_objetivo cuando el peso esta dentro del umbral', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue({
      dia_vida: 21,
      peso_promedio_g: 1035,
      fcr: 1.18,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue({
      dia: 21,
      peso_esperado_g: 1035,
      fcr_objetivo: 1.18,
    });

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('en_objetivo');
    expect(r.desvio_peso_pct as number).toBeCloseTo(0, 5);
  });
});

describe('IndicadoresService · generarAlertaDesvio', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    indicadorLote: { findFirst: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
    alerta: { findFirst: jest.fn(), create: jest.fn() },
  };

  const lote = {
    galpon: { granja: { propietario_id: 1 } },
    galpon_id: 7,
    sexo: 'macho',
    marca_alimento: 'italcol',
  };

  const curvaDia21 = { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 };

  const ponerPorDebajo = () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue({
      dia_vida: 21,
      peso_promedio_g: 900,
      fcr: 1.3,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaDia21);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
  });

  afterEach(() => jest.clearAllMocks());

  it('no genera alerta cuando el lote no va por debajo', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue({
      dia_vida: 21,
      peso_promedio_g: 1035,
      fcr: 1.18,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaDia21);

    const r = await service.generarAlertaDesvio(1);
    expect(r).toBeNull();
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('no duplica si ya existe una alerta de desvio abierta', async () => {
    ponerPorDebajo();
    prisma.alerta.findFirst.mockResolvedValue({ id: 99 });

    const r = await service.generarAlertaDesvio(1);
    expect(r).toBeNull();
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('crea la alerta cuando va por debajo y no hay una abierta', async () => {
    ponerPorDebajo();
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 1 });

    await service.generarAlertaDesvio(1);

    expect(prisma.alerta.create).toHaveBeenCalledTimes(1);
    const calls = prisma.alerta.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({
      galpon_id: 7,
      lote_id: 1,
      tipo: 'desvio_peso',
      criticidad: 'media',
    });
  });
});
