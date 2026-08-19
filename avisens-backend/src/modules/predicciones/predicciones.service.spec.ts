import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrediccionesService } from './predicciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

describe('PrediccionesService', () => {
  let service: PrediccionesService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const loteConDueno = {
    fecha_ingreso: new Date('2026-07-01'),
    cantidad_inicial: 1000,
    galpon: { granja: { propietario_id: 5 } },
  };

  const tresPesajes = [
    { fecha: new Date('2026-07-08'), peso_promedio_g: 180 },
    { fecha: new Date('2026-07-15'), peso_promedio_g: 500 },
    { fecha: new Date('2026-07-22'), peso_promedio_g: 1000 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PrediccionesService>(PrediccionesService);
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes);
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
    prisma.consumoDiario.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lanza NotFound cuando el lote no existe', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);
    await expect(service.predecir(1, admin)).rejects.toThrow(NotFoundException);
  });

  it('lanza Forbidden cuando el lote es de otro propietario', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      fecha_ingreso: new Date('2026-07-01'),
      galpon: { granja: { propietario_id: 999 } },
    });
    await expect(service.predecir(1, propietario)).rejects.toThrow(
      /propios lotes/,
    );
  });

  it('lanza BadRequest cuando hay menos de 3 pesajes', async () => {
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes.slice(0, 2));
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequest cuando el servicio ML responde con error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('devuelve la prediccion del servicio ML con los dias calculados', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: 37,
        peso_objetivo_g: 2500,
      }),
    });
    global.fetch = fetchMock;

    const r = await service.predecir(1, admin);

    expect(r).toMatchObject({
      lote_id: 1,
      pesajes_usados: 3,
      peso_proyectado_faena_g: 3256,
      dias_al_objetivo: 37,
    });

    const calls = fetchMock.mock.calls as Array<[string, { body: string }]>;
    const body = JSON.parse(calls[0][1].body) as {
      pesajes: Array<{ dia: number; peso: number }>;
    };
    expect(body.pesajes).toEqual([
      { dia: 7, peso: 180 },
      { dia: 14, peso: 500 },
      { dia: 21, peso: 1000 },
    ]);
  });

  it('incluye la mortalidad proyectada cuando hay 3+ registros', async () => {
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
      { fecha: new Date('2026-07-15'), cantidad_aves: 5 },
      { fecha: new Date('2026-07-22'), cantidad_aves: 5 },
    ]);
    global.fetch = jest.fn((url: string) => {
      const body = url.includes('predecir-mortalidad')
        ? { mortalidad_proyectada_pct: 4.4, dia_faena: 42 }
        : {
            peso_proyectado_faena_g: 3256,
            dia_faena: 42,
            dias_al_objetivo: 37,
            peso_objetivo_g: 2500,
          };
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);

    expect(r).toMatchObject({
      peso_proyectado_faena_g: 3256,
      mortalidad_proyectada_pct: 4.4,
    });
  });

  it('deja la mortalidad en null cuando hay menos de 3 registros', async () => {
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: 37,
        peso_objetivo_g: 2500,
      }),
    });

    const r = await service.predecir(1, admin);
    expect(r.mortalidad_proyectada_pct).toBeNull();
  });
  it('incluye el consumo proyectado cuando hay 3+ registros', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ]);
    global.fetch = jest.fn((url: string) => {
      const body = url.includes('predecir-consumo')
        ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
        : {
            peso_proyectado_faena_g: 3256,
            dia_faena: 42,
            dias_al_objetivo: 37,
            peso_objetivo_g: 2500,
          };
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);

    expect(r).toMatchObject({
      peso_proyectado_faena_g: 3256,
      consumo_proyectado_kg: 4550.75,
    });
  });

  it('acumula el consumo diario y deduplica los dias repetidos', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 100 },
      { fecha: new Date('2026-07-08'), alimento_kg: 65 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: null },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ]);
    const fetchMock = jest.fn((url: string) => {
      const body = url.includes('predecir-consumo')
        ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
        : {
            peso_proyectado_faena_g: 3256,
            dia_faena: 42,
            dias_al_objetivo: 37,
            peso_objetivo_g: 2500,
          };
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.predecir(1, admin);

    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { body: string }]
    >;
    const llamada = calls.find(([url]) => url.includes('predecir-consumo'));
    const body = JSON.parse(llamada![1].body) as {
      consumos: Array<{ dia: number; consumo_acum_kg: number }>;
    };
    expect(body.consumos).toEqual([
      { dia: 7, consumo_acum_kg: 165 },
      { dia: 14, consumo_acum_kg: 520 },
      { dia: 21, consumo_acum_kg: 1130 },
    ]);
  });

  it('deja el consumo en null cuando hay menos de 3 registros', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: 37,
        peso_objetivo_g: 2500,
      }),
    });

    const r = await service.predecir(1, admin);
    expect(r.consumo_proyectado_kg).toBeNull();
  });
});
