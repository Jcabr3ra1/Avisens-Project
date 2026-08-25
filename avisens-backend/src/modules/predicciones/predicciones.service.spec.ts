import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrediccionesService } from './predicciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('PrediccionesService', () => {
  let service: PrediccionesService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
    prediccion: { createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
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
    jest.clearAllMocks();
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
    prisma.curvaObjetivo.findFirst.mockResolvedValue(null);
    prisma.prediccion.createMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  const respuestaMl = {
    peso_proyectado_faena_g: 2400,
    dia_faena: 42,
    dias_al_objetivo: 5,
    peso_objetivo_g: 2400,
  };

  // Cada ruta del servicio ML devuelve una forma distinta; un solo mock para
  // las tres haria que mortalidad y consumo recibieran el cuerpo del peso.
  const mlResponde = () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const cuerpo = url.includes('/predecir-mortalidad')
        ? { mortalidad_proyectada_pct: 4.2, dia_faena: 42 }
        : url.includes('/predecir-consumo')
          ? { consumo_proyectado_kg: 3800, dia_faena: 42 }
          : respuestaMl;
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(cuerpo),
      });
    });
  };

  const filasGuardadas = () => {
    const [args] = prisma.prediccion.createMany.mock.calls[0] as [
      { data: Array<{ tipo: string; valor_predicho: number; unidad?: string }> },
    ];
    return args.data;
  };

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
  it('calcula el FCR proyectado a partir del consumo y la mortalidad', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ]);
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
      { fecha: new Date('2026-07-15'), cantidad_aves: 5 },
      { fecha: new Date('2026-07-22'), cantidad_aves: 5 },
    ]);
    global.fetch = jest.fn((url: string) => {
      let body: Record<string, number | null>;
      if (url.includes('predecir-consumo')) {
        body = { consumo_proyectado_kg: 4550.75, dia_faena: 42 };
      } else if (url.includes('predecir-mortalidad')) {
        body = { mortalidad_proyectada_pct: 3.5, dia_faena: 42 };
      } else {
        body = {
          peso_proyectado_faena_g: 3661,
          dia_faena: 42,
          dias_al_objetivo: 35,
          peso_objetivo_g: 2500,
        };
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);

    expect(r.fcr_proyectado).toBeCloseTo(1.3, 2);
  });

  it('deja el FCR en null cuando no hay consumo proyectado', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3661,
        dia_faena: 42,
        dias_al_objetivo: 35,
        peso_objetivo_g: 2500,
      }),
    });

    const r = await service.predecir(1, admin);
    expect(r.consumo_proyectado_kg).toBeNull();
    expect(r.fcr_proyectado).toBeNull();
  });

  it('deja el FCR en null cuando la ganancia proyectada no es positiva', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ]);
    global.fetch = jest.fn((url: string) => {
      const body = url.includes('predecir-consumo')
        ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
        : {
            peso_proyectado_faena_g: 40,
            dia_faena: 42,
            dias_al_objetivo: null,
            peso_objetivo_g: 2500,
          };
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);
    expect(r.fcr_proyectado).toBeNull();
  });
  const curvaFaena = {
    dia: 42,
    marca: 'italcol',
    sexo: 'macho',
    peso_esperado_g: 3100,
    fcr_objetivo: 1.57,
  };

  const mockMlCompleto = () =>
    jest.fn((url: string) => {
      let body: Record<string, number | null>;
      if (url.includes('predecir-consumo')) {
        body = { consumo_proyectado_kg: 4550.75, dia_faena: 42 };
      } else if (url.includes('predecir-mortalidad')) {
        body = { mortalidad_proyectada_pct: 3.5, dia_faena: 42 };
      } else {
        body = {
          peso_proyectado_faena_g: 3661,
          dia_faena: 42,
          dias_al_objetivo: 35,
          peso_objetivo_g: 2500,
        };
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

  const sembrarSerieCompleta = () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ]);
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
      { fecha: new Date('2026-07-15'), cantidad_aves: 5 },
      { fecha: new Date('2026-07-22'), cantidad_aves: 5 },
    ]);
  };

  it('compara la proyeccion contra la curva objetivo de la marca', async () => {
    sembrarSerieCompleta();
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaFaena);
    global.fetch = mockMlCompleto();

    const r = await service.predecir(1, admin);

    expect(r.comparacion_objetivo).toMatchObject({
      dia_curva: 42,
      marca: 'italcol',
      peso_esperado_g: 3100,
      fcr_objetivo: 1.57,
      veredicto_peso: 'por_encima',
      veredicto_fcr: 'mejor_que_objetivo',
    });
  });

  it('busca la curva sin distinguir mayusculas en marca y sexo', async () => {
    sembrarSerieCompleta();
    prisma.lote.findUnique.mockResolvedValue({
      ...loteConDueno,
      sexo: 'Macho',
      marca_alimento: 'Italcol',
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaFaena);
    global.fetch = mockMlCompleto();

    await service.predecir(1, admin);

    const llamadas = prisma.curvaObjetivo.findFirst.mock.calls as Array<
      [{ where: Record<string, { equals: string; mode: string }> }]
    >;
    const where = llamadas[0][0].where;
    expect(where.marca).toEqual({ equals: 'Italcol', mode: 'insensitive' });
    expect(where.sexo).toEqual({ equals: 'Macho', mode: 'insensitive' });
  });

  it('marca el FCR como peor_que_objetivo cuando supera la curva', async () => {
    sembrarSerieCompleta();
    prisma.curvaObjetivo.findFirst.mockResolvedValue({
      ...curvaFaena,
      fcr_objetivo: 1.1,
    });
    global.fetch = mockMlCompleto();

    const r = await service.predecir(1, admin);

    expect(r.comparacion_objetivo).toMatchObject({
      veredicto_fcr: 'peor_que_objetivo',
    });
  });

  it('deja la comparacion en null cuando no hay curva para el lote', async () => {
    sembrarSerieCompleta();
    prisma.curvaObjetivo.findFirst.mockResolvedValue(null);
    global.fetch = mockMlCompleto();

    const r = await service.predecir(1, admin);
    expect(r.comparacion_objetivo).toBeNull();
  });
  it('corta la llamada al servicio ML con un timeout', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3661,
        dia_faena: 42,
        dias_al_objetivo: 35,
        peso_objetivo_g: 2500,
      }),
    });
    global.fetch = fetchMock;

    await service.predecir(1, admin);

    const llamadas = fetchMock.mock.calls as Array<
      [string, { signal?: AbortSignal }]
    >;
    const opciones = llamadas[0][1];
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it('lanza BadRequest cuando el servicio ML se cuelga y aborta', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      );

    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deja mortalidad y consumo en null cuando esas llamadas al ML se cuelgan', async () => {
    sembrarSerieCompleta();
    global.fetch = jest.fn((url: string) => {
      if (
        url.includes('predecir-mortalidad') ||
        url.includes('predecir-consumo')
      ) {
        return Promise.reject(new Error('timeout'));
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          peso_proyectado_faena_g: 3661,
          dia_faena: 42,
          dias_al_objetivo: 35,
          peso_objetivo_g: 2500,
        }),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);

    expect(r.peso_proyectado_faena_g).toBe(3661);
    expect(r.mortalidad_proyectada_pct).toBeNull();
    expect(r.consumo_proyectado_kg).toBeNull();
    expect(r.fcr_proyectado).toBeNull();
  });

  describe('persistencia', () => {
    it('por defecto NO guarda nada: el GET solo calcula', async () => {
      mlResponde();

      await service.predecir(1, admin);

      expect(prisma.prediccion.createMany).not.toHaveBeenCalled();
    });

    it('con persistir=true guarda una fila por magnitud proyectada', async () => {
      mlResponde();
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
        { fecha: new Date('2026-07-15'), cantidad_aves: 12 },
        { fecha: new Date('2026-07-22'), cantidad_aves: 15 },
      ]);
      prisma.consumoDiario.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-08'), alimento_kg: 100 },
        { fecha: new Date('2026-07-15'), alimento_kg: 300 },
        { fecha: new Date('2026-07-22'), alimento_kg: 600 },
      ]);

      const r = await service.predecir(1, admin, true);

      const tipos = filasGuardadas().map((f) => f.tipo);
      expect(tipos).toEqual(['peso_faena', 'mortalidad', 'consumo', 'fcr']);
      expect(r.predicciones_guardadas).toBe(4);
    });

    it('guarda el peso proyectado con su unidad', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const peso = filasGuardadas().find((f) => f.tipo === 'peso_faena');
      expect(peso?.valor_predicho).toBe(2400);
      expect(peso?.unidad).toBe('g');
    });

    it('no guarda las magnitudes que no se pudieron calcular', async () => {
      mlResponde();
      // Sin registros de mortalidad ni de consumo, esas proyecciones son null
      // y no deben quedar como filas con valor vacio.
      await service.predecir(1, admin, true);

      expect(filasGuardadas().map((f) => f.tipo)).toEqual(['peso_faena']);
    });

    it('la fecha objetivo es la de ingreso mas el dia de faena', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        { data: Array<{ fecha_objetivo: Date }> },
      ];
      // 2026-07-01 + 42 dias
      expect(args.data[0].fecha_objetivo.toISOString().slice(0, 10)).toBe(
        '2026-08-12',
      );
    });

    it('conserva los pesajes usados como datos de entrada, para poder auditar', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        { data: Array<{ datos_entrada: { pesajes: unknown[] } }> },
      ];
      expect(args.data[0].datos_entrada.pesajes).toHaveLength(3);
    });
  });

  describe('historial', () => {
    it('devuelve las predicciones del lote, de la mas reciente a la mas antigua', async () => {
      await service.historial(1, admin, { page: 1, limit: 10 });

      expect(prisma.prediccion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lote_id: 1 },
          orderBy: { fecha_generacion: 'desc' },
        }),
      );
    });

    it('filtra por tipo cuando se indica', async () => {
      await service.historial(1, admin, { page: 1, limit: 10 }, 'fcr');

      expect(prisma.prediccion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lote_id: 1, tipo: 'fcr' } }),
      );
    });

    it('lanza NotFound cuando el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(
        service.historial(99, admin, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('impide al propietario ver el historial de un lote ajeno', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.historial(1, propietario, { page: 1, limit: 10 }),
      ).rejects.toThrow(/propios lotes/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
