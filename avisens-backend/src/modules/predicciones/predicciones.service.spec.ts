import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrediccionesService } from './predicciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanLoteService } from '../plan-lote/plan-lote.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';
import { ConfigService } from '@nestjs/config';

describe('PrediccionesService', () => {
  let service: PrediccionesService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
    prediccion: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    modeloMl: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = { get: jest.fn() };
  const planLoteService = { obtener: jest.fn() };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const loteConDueno = {
    fecha_ingreso: new Date('2026-07-01'),
    cantidad_inicial: 1000,
    galpon: { granja: { propietario_id: 5 } },
  };

  // dia_objetivo=42 y peso_objetivo_g=2400: elegidos para no desplazar
  // ninguna fecha/pesaje ya fijado en el resto del archivo -- antes esos
  // dos numeros salian de DIA_FAENA_PROYECCION y del default 2500g del ML;
  // ahora salen del plan vigente del lote.
  const planCalculado = {
    id: 501,
    lote_id: 1,
    version: 3,
    vigente: true,
    peso_objetivo_g: 2400,
    estado_dia: 'calculado' as const,
    desactualizado: false,
    resultado: {
      dia_objetivo: 42,
      dia_objetivo_interpolado: 42,
      fecha_salida_calculada: new Date('2026-08-11'),
    },
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
        { provide: ConfigService, useValue: config },
        { provide: PlanLoteService, useValue: planLoteService },
      ],
    }).compile();
    service = module.get<PrediccionesService>(PrediccionesService);
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes);
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
    prisma.consumoDiario.findMany.mockResolvedValue([]);
    prisma.curvaObjetivo.findFirst.mockResolvedValue(null);
    prisma.prediccion.createMany.mockResolvedValue({ count: 0 });
    prisma.modeloMl.upsert.mockResolvedValue({ id: 11 });
    config.get.mockImplementation((clave: string, defecto?: string) => defecto);
    prisma.$transaction.mockResolvedValue([[], 0]);
    planLoteService.obtener.mockResolvedValue({ ...planCalculado });
  });

  const respuestaMl = {
    peso_proyectado_faena_g: 2400,
    dia_faena: 42,
    dias_al_objetivo: 5,
    peso_objetivo_g: 2400,
    modelo: {
      nombre: 'crecimiento_aves',
      version: '1.1.0',
      framework: 'numpy',
      tipo: 'regresion_polinomial',
      objetivo: 'peso_faena',
      confianza: 0.94,
      puntos_usados: 3,
    },
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
      {
        data: Array<{ tipo: string; valor_predicho: number; unidad?: string }>;
      },
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

  describe('plan vigente del lote', () => {
    it('convierte la ausencia de plan vigente en 422 sin_plan_utilizable, sin llegar a leer pesajes', async () => {
      planLoteService.obtener.mockRejectedValue(
        new NotFoundException('Este lote no tiene un plan vigente'),
      );

      let error: unknown;
      try {
        await service.predecir(1, admin);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      const respuesta = (error as UnprocessableEntityException).getResponse();
      expect(respuesta).toMatchObject({
        codigo: 'sin_plan_utilizable',
        estado_plan: 'sin_plan',
      });
      expect(prisma.pesaje.findMany).not.toHaveBeenCalled();
    });

    it('no convierte un 404 ajeno al plan -- lo relanza tal cual', async () => {
      planLoteService.obtener.mockRejectedValue(
        new NotFoundException('Lote no encontrado'),
      );

      await expect(service.predecir(1, admin)).rejects.toThrow(
        'Lote no encontrado',
      );
    });

    it.each(['sin_curva', 'fuera_de_rango', 'datos_insuficientes'] as const)(
      'plan con estado_dia=%s -> 422 sin_plan_utilizable con ese estado',
      async (estado) => {
        planLoteService.obtener.mockResolvedValue({
          ...planCalculado,
          estado_dia: estado,
          resultado: { ...planCalculado.resultado, dia_objetivo: null },
        });

        let error: unknown;
        try {
          await service.predecir(1, admin);
        } catch (e) {
          error = e;
        }

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(
          (error as UnprocessableEntityException).getResponse(),
        ).toMatchObject({ codigo: 'sin_plan_utilizable', estado_plan: estado });
      },
    );

    it('plan desactualizado -> 422 plan_desactualizado, no llama al ML', async () => {
      planLoteService.obtener.mockResolvedValue({
        ...planCalculado,
        desactualizado: true,
      });
      const fetchMock = jest.fn();
      global.fetch = fetchMock;

      let error: unknown;
      try {
        await service.predecir(1, admin);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({ codigo: 'plan_desactualizado' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('plan desactualizado y sin curva a la vez: gana plan_desactualizado', async () => {
      planLoteService.obtener.mockResolvedValue({
        ...planCalculado,
        desactualizado: true,
        estado_dia: 'sin_curva',
        resultado: { ...planCalculado.resultado, dia_objetivo: null },
      });

      let error: unknown;
      try {
        await service.predecir(1, admin);
      } catch (e) {
        error = e;
      }
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({ codigo: 'plan_desactualizado' });
    });

    it('estado_dia calculado pero dia_objetivo null (fila corrupta): no revienta, cae a sin_plan_utilizable con estado_plan=datos_insuficientes, no "calculado"', async () => {
      planLoteService.obtener.mockResolvedValue({
        ...planCalculado,
        resultado: { ...planCalculado.resultado, dia_objetivo: null },
      });

      let error: unknown;
      try {
        await service.predecir(1, admin);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      // "calculado" no esta en la lista blanca del filtro (ESTADOS_PLAN_VALIDOS);
      // reportarlo tal cual haria que el filtro lo descarte en silencio.
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({
        codigo: 'sin_plan_utilizable',
        estado_plan: 'datos_insuficientes',
      });
    });

    it.each([
      { dia_objetivo: 0, peso_objetivo_g: 2400 },
      { dia_objetivo: 101, peso_objetivo_g: 2400 },
      { dia_objetivo: 42, peso_objetivo_g: 0 },
      { dia_objetivo: 42, peso_objetivo_g: 10001 },
    ])(
      'plan con dia_objetivo=$dia_objetivo, peso_objetivo_g=$peso_objetivo_g (fuera de lo que acepta el ML): 422 plan_excede_limites_ml, no llama al ML',
      async ({ dia_objetivo, peso_objetivo_g }) => {
        planLoteService.obtener.mockResolvedValue({
          ...planCalculado,
          peso_objetivo_g,
          resultado: { ...planCalculado.resultado, dia_objetivo },
        });
        const fetchMock = jest.fn();
        global.fetch = fetchMock;

        let error: unknown;
        try {
          await service.predecir(1, admin);
        } catch (e) {
          error = e;
        }

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(
          (error as UnprocessableEntityException).getResponse(),
        ).toMatchObject({
          codigo: 'plan_excede_limites_ml',
          dia_faena: dia_objetivo,
          peso_objetivo_g,
        });
        // No es "el servicio no respondio" (eso es para cuando el ML de
        // verdad falla): explica el limite excedido, sin llegar a llamarlo.
        const mensaje = (
          (error as UnprocessableEntityException).getResponse() as {
            message: string;
          }
        ).message;
        expect(mensaje).not.toMatch(/no respondió/);
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it('plan dentro de los limites del ML (borde: dia 100, peso 10000): si llama al ML', async () => {
      planLoteService.obtener.mockResolvedValue({
        ...planCalculado,
        peso_objetivo_g: 10000,
        resultado: { ...planCalculado.resultado, dia_objetivo: 100 },
      });
      prisma.pesaje.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-08'), peso_promedio_g: 4000 },
        { fecha: new Date('2026-08-09'), peso_promedio_g: 4050 },
        { fecha: new Date('2026-08-10'), peso_promedio_g: 4100 },
      ]);
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          peso_proyectado_faena_g: 4200,
          dia_faena: 100,
          dias_al_objetivo: null,
          peso_objetivo_g: 10000,
        }),
      });
      global.fetch = fetchMock;

      await service.predecir(1, admin);

      expect(fetchMock).toHaveBeenCalled();
    });

    it('usa el peso objetivo y el dia de faena del plan vigente, no un valor fijo', async () => {
      planLoteService.obtener.mockResolvedValue({
        ...planCalculado,
        peso_objetivo_g: 2800,
        resultado: { ...planCalculado.resultado, dia_objetivo: 35 },
      });
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          peso_proyectado_faena_g: 3000,
          dia_faena: 35,
          dias_al_objetivo: null,
          peso_objetivo_g: 2800,
        }),
      });
      global.fetch = fetchMock;

      await service.predecir(1, admin);

      expect(planLoteService.obtener).toHaveBeenCalledWith(1, admin);
      const body = JSON.parse(
        (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
      ) as { dia_faena: number; peso_objetivo_g: number };
      expect(body).toMatchObject({ dia_faena: 35, peso_objetivo_g: 2800 });
    });

    it('peso_objetivo_g discordante devuelto por el ML: 400, no se combina con el plan', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          peso_proyectado_faena_g: 3256,
          dia_faena: 42,
          dias_al_objetivo: 37,
          peso_objetivo_g: 2500, // el plan pide 2400
        }),
      });

      await expect(service.predecir(1, admin)).rejects.toThrow(
        /peso objetivo inconsistente/,
      );
    });
  });

  it('lanza BadRequest cuando hay menos de 3 pesajes', async () => {
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes.slice(0, 2));
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('exige pesajes de al menos 3 días distintos', async () => {
    prisma.pesaje.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), peso_promedio_g: 180 },
      { fecha: new Date('2026-07-08'), peso_promedio_g: 200 },
      { fecha: new Date('2026-07-15'), peso_promedio_g: 500 },
    ]);

    await expect(service.predecir(1, admin)).rejects.toThrow(
      /3 días distintos/,
    );
  });

  it('promedia los pesajes del mismo día antes de enviarlos al modelo', async () => {
    prisma.pesaje.findMany.mockResolvedValue([
      { fecha: new Date('2026-07-08'), peso_promedio_g: 180 },
      { fecha: new Date('2026-07-08'), peso_promedio_g: 200 },
      { fecha: new Date('2026-07-15'), peso_promedio_g: 500 },
      { fecha: new Date('2026-07-22'), peso_promedio_g: 1000 },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(respuestaMl),
    });
    global.fetch = fetchMock;

    await service.predecir(1, admin);

    const calls = fetchMock.mock.calls as Array<[string, { body: string }]>;
    const body = JSON.parse(calls[0][1].body) as {
      pesajes: Array<{ dia: number; peso: number }>;
    };
    expect(body.pesajes[0]).toEqual({ dia: 8, peso: 190 });
  });

  it('lanza BadRequest cuando el servicio ML responde con error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza una respuesta 200 con contrato inválido', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ peso_proyectado_faena_g: 'mucho' }),
    });

    await expect(service.predecir(1, admin)).rejects.toThrow(
      /respuesta inválida/,
    );
  });

  it('devuelve la prediccion del servicio ML, con la llegada proyectada aparte', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: 37,
        peso_objetivo_g: 2400,
      }),
    });
    global.fetch = fetchMock;

    const r = await service.predecir(1, admin);

    expect(r).toMatchObject({
      lote_id: 1,
      pesajes_usados: 3,
      peso_proyectado_faena_g: 3256,
    });
    // dias_al_objetivo ya no viaja suelto: es informativo, dentro de
    // llegada_proyectada. fechaDeVida(2026-07-01, 37) = 2026-08-06.
    expect((r as { dias_al_objetivo?: unknown }).dias_al_objetivo).toBeUndefined();
    expect(r.llegada_proyectada?.dia_vida).toBe(37);
    expect(
      r.llegada_proyectada?.fecha.toISOString().slice(0, 10),
    ).toBe('2026-08-06');

    const calls = fetchMock.mock.calls as Array<[string, { body: string }]>;
    const body = JSON.parse(calls[0][1].body) as {
      pesajes: Array<{ dia: number; peso: number }>;
    };
    expect(body.pesajes).toEqual([
      { dia: 8, peso: 180 },
      { dia: 15, peso: 500 },
      { dia: 22, peso: 1000 },
    ]);
  });

  it('llegada_proyectada queda en null cuando el ML no calcula ninguna', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: null,
        peso_objetivo_g: 2400,
      }),
    });

    const r = await service.predecir(1, admin);
    expect(r.llegada_proyectada).toBeNull();
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
            peso_objetivo_g: 2400,
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
        peso_objetivo_g: 2400,
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
            peso_objetivo_g: 2400,
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
            peso_objetivo_g: 2400,
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
      { dia: 8, consumo_acum_kg: 165 },
      { dia: 15, consumo_acum_kg: 520 },
      { dia: 22, consumo_acum_kg: 1130 },
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
        peso_objetivo_g: 2400,
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
          peso_objetivo_g: 2400,
        };
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);

    // 4550.75 / (3661/1000 * 965 aves vivas) = 1.29 -- sin restar
    // PESO_INICIAL_G, misma convencion que indicadores.service.ts desde
    // el PR #291.
    expect(r.fcr_proyectado).toBeCloseTo(1.29, 2);
    // Control negativo: el resultado que daria restando PESO_INICIAL_G
    // (4550.75 / ((3661-42)/1000 * 965) = 1.30).
    expect(r.fcr_proyectado).not.toBeCloseTo(1.3, 2);
  });

  it('deja el FCR en null cuando no hay consumo proyectado', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3661,
        dia_faena: 42,
        dias_al_objetivo: 35,
        peso_objetivo_g: 2400,
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
      // peso 0: sin restar PESO_INICIAL_G, ya no hay ningun peso positivo
      // que produzca una ganancia <= 0 salvo el propio cero.
      const body = url.includes('predecir-consumo')
        ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
        : {
            peso_proyectado_faena_g: 0,
            dia_faena: 42,
            dias_al_objetivo: null,
            peso_objetivo_g: 2400,
          };
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });
    }) as unknown as typeof fetch;

    const r = await service.predecir(1, admin);
    expect(r.fcr_proyectado).toBeNull();
  });

  describe('correspondencia de dia_faena entre las tres llamadas ML', () => {
    const tresConsumos = [
      { fecha: new Date('2026-07-08'), alimento_kg: 165 },
      { fecha: new Date('2026-07-15'), alimento_kg: 355 },
      { fecha: new Date('2026-07-22'), alimento_kg: 610 },
    ];
    const tresMortalidades = [
      { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
      { fecha: new Date('2026-07-15'), cantidad_aves: 5 },
      { fecha: new Date('2026-07-22'), cantidad_aves: 5 },
    ];

    it('pide el mismo dia_faena a las tres llamadas ML', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue(tresConsumos);
      prisma.registroMortalidad.findMany.mockResolvedValue(tresMortalidades);
      const fetchMock = jest.fn((url: string) => {
        const body = url.includes('predecir-consumo')
          ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
          : url.includes('predecir-mortalidad')
            ? { mortalidad_proyectada_pct: 3.5, dia_faena: 42 }
            : {
                peso_proyectado_faena_g: 3661,
                dia_faena: 42,
                dias_al_objetivo: 35,
                peso_objetivo_g: 2400,
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
      const diasFaenaEnviados = calls.map(
        ([, init]) => (JSON.parse(init.body) as { dia_faena: number }).dia_faena,
      );
      expect(diasFaenaEnviados).toEqual([42, 42, 42]);
    });

    it('el modelo de peso devuelve un dia_faena discordante: detiene con error, no sigue con ese peso', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          peso_proyectado_faena_g: 3661,
          dia_faena: 45, // se pidio 42 (el dia_objetivo del plan)
          dias_al_objetivo: 35,
          peso_objetivo_g: 2400,
        }),
      });

      await expect(service.predecir(1, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('la mortalidad proyectada devuelve un dia_faena discordante: se descarta esa magnitud, no rompe la prediccion', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue(tresConsumos);
      prisma.registroMortalidad.findMany.mockResolvedValue(tresMortalidades);
      global.fetch = jest.fn((url: string) => {
        const body = url.includes('predecir-consumo')
          ? { consumo_proyectado_kg: 4550.75, dia_faena: 42 }
          : url.includes('predecir-mortalidad')
            ? { mortalidad_proyectada_pct: 3.5, dia_faena: 40 } // discordante: se pidio 42
            : {
                peso_proyectado_faena_g: 3661,
                dia_faena: 42,
                dias_al_objetivo: 35,
                peso_objetivo_g: 2400,
              };
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(body),
        });
      }) as unknown as typeof fetch;

      const r = await service.predecir(1, admin);

      // No se combina el 3.5% del dia 40 con el peso del dia 42.
      expect(r.mortalidad_proyectada_pct).toBeNull();
      // El resto de la prediccion sigue -- fcr cae al mismo supuesto que
      // ya usa cuando no hay mortalidad en absoluto (0% de mortalidad).
      expect(r.fcr_proyectado).not.toBeNull();
    });

    it('el consumo proyectado devuelve un dia_faena discordante: se descarta esa magnitud y el fcr queda en null', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue(tresConsumos);
      global.fetch = jest.fn((url: string) => {
        const body = url.includes('predecir-consumo')
          ? { consumo_proyectado_kg: 4550.75, dia_faena: 38 } // discordante: se pidio 42
          : {
              peso_proyectado_faena_g: 3661,
              dia_faena: 42,
              dias_al_objetivo: 35,
              peso_objetivo_g: 2400,
            };
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(body),
        });
      }) as unknown as typeof fetch;

      const r = await service.predecir(1, admin);

      expect(r.consumo_proyectado_kg).toBeNull();
      // calcularFcrProyectado() ya devuelve null sin consumo -- no se
      // combina un consumo de otro dia con el peso del dia 42.
      expect(r.fcr_proyectado).toBeNull();
    });
  });

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
          peso_objetivo_g: 2400,
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

  // compararConObjetivo() queda definida en el servicio pero sin llamarse:
  // el plan usa la curva GENETICA (por linea+sexo) y curvas_objetivo es por
  // MARCA -- son referencias distintas, no se combinan. Se restablece en el
  // hito que resuelva N3/N4.
  it('comparacion_objetivo queda en null con un motivo explicito; no se consulta curvas_objetivo', async () => {
    sembrarSerieCompleta();
    global.fetch = mockMlCompleto();

    const r = await service.predecir(1, admin);

    expect(r.comparacion_objetivo).toBeNull();
    expect(r.comparacion_objetivo_motivo).toBe(
      'plan_usa_curva_genetica_no_unificada_con_curvas_objetivo',
    );
    expect(prisma.curvaObjetivo.findFirst).not.toHaveBeenCalled();
  });

  it('corta la llamada al servicio ML con un timeout', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3661,
        dia_faena: 42,
        dias_al_objetivo: 35,
        peso_objetivo_g: 2400,
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
          peso_objetivo_g: 2400,
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

    it('registra la versión del modelo y la enlaza con la predicción', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const llamadasModelo = prisma.modeloMl.upsert.mock.calls as Array<
        [
          {
            create: { nombre: string; version: string; framework: string };
          },
        ]
      >;
      expect(llamadasModelo[0][0].create).toMatchObject({
        nombre: 'crecimiento_aves',
        version: '1.1.0',
        framework: 'numpy',
      });
      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        { data: Array<{ modelo_id?: number; confianza?: number }> },
      ];
      expect(args.data[0]).toMatchObject({
        modelo_id: 11,
        confianza: 0.94,
      });
    });

    it('reutiliza un modelo ya registrado', async () => {
      mlResponde();
      prisma.modeloMl.upsert.mockResolvedValue({ id: 8 });

      await service.predecir(1, admin, true);

      expect(prisma.modeloMl.upsert).toHaveBeenCalledTimes(1);
      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        { data: Array<{ modelo_id?: number }> },
      ];
      expect(args.data[0].modelo_id).toBe(8);
    });

    it('no guarda las magnitudes que no se pudieron calcular', async () => {
      mlResponde();
      // Sin registros de mortalidad ni de consumo, esas proyecciones son null
      // y no deben quedar como filas con valor vacio.
      await service.predecir(1, admin, true);

      expect(filasGuardadas().map((f) => f.tipo)).toEqual(['peso_faena']);
    });

    it('la fecha objetivo es la de ingreso mas el dia de faena del plan', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        { data: Array<{ fecha_objetivo: Date }> },
      ];
      // fechaDeVida(2026-07-01, 42): el ingreso cuenta como dia 1, asi que
      // el dia 42 cae 41 dias despues, no 42.
      expect(args.data[0].fecha_objetivo.toISOString().slice(0, 10)).toBe(
        '2026-08-11',
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

    it('marca cada fila nueva con el origen real (plan_lote) y la trazabilidad del plan usado', async () => {
      mlResponde();

      await service.predecir(1, admin, true);

      const [args] = prisma.prediccion.createMany.mock.calls[0] as [
        {
          data: Array<{
            datos_entrada: {
              version_calculo: string;
              convencion_dia: string;
              origen_dia_faena: string;
              peso_objetivo_origen: string;
              peso_objetivo_g: number;
              plan_lote_id: number;
              plan_version: number;
              llegada_proyectada_dia: number | null;
              omisiones: unknown[];
              observaciones_descartadas: {
                pesajes: number;
                mortalidades: number;
                consumos: number;
                motivo: string;
              };
            };
          }>,
        },
      ];
      expect(args.data[0].datos_entrada).toMatchObject({
        version_calculo: 'predicciones-v2',
        convencion_dia: 'dia_vida_desde_1',
        origen_dia_faena: 'plan_lote',
        peso_objetivo_origen: 'plan_lote',
        peso_objetivo_g: 2400,
        plan_lote_id: 501,
        plan_version: 3,
        llegada_proyectada_dia: 5,
        omisiones: [],
        observaciones_descartadas: {
          pesajes: 0,
          mortalidades: 0,
          consumos: 0,
          motivo: 'antes_del_ingreso',
        },
      });
    });
  });

  describe('T2: horizonte de proyeccion vencido y fechas anteriores al ingreso', () => {
    // fecha_ingreso es 2026-07-01 (dia 1). fechaDeVida(ingreso, dia) cae en:
    // dia 39 -> 2026-08-08, dia 40 -> 08-09, dia 41 -> 08-10,
    // dia 42 -> 08-11, dia 43 -> 08-12 (el plan por defecto pide dia 42).
    it('peso vencido (ultimo pesaje >= dia_faena): 422 con codigo horizonte_vencido, no llama al ML, no persiste nada', async () => {
      prisma.pesaje.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-10'), peso_promedio_g: 3000 },
        { fecha: new Date('2026-08-11'), peso_promedio_g: 3100 },
        { fecha: new Date('2026-08-12'), peso_promedio_g: 3200 },
      ]);
      const fetchMock = jest.fn();
      global.fetch = fetchMock;

      let error: unknown;
      try {
        await service.predecir(1, admin, true);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      const respuesta = (error as UnprocessableEntityException).getResponse();
      expect(respuesta).toMatchObject({
        codigo: 'horizonte_vencido',
        dia_faena: 42,
        ultimo_dia_observado: 43,
      });
      expect((respuesta as { message: string }).message).toMatch(/43/);
      expect((respuesta as { message: string }).message).toMatch(/42/);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.prediccion.createMany).not.toHaveBeenCalled();
    });

    it('borde: el ultimo pesaje en dia_faena - 1 si proyecta', async () => {
      prisma.pesaje.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-08'), peso_promedio_g: 2900 },
        { fecha: new Date('2026-08-09'), peso_promedio_g: 2950 },
        { fecha: new Date('2026-08-10'), peso_promedio_g: 3000 },
      ]);
      mlResponde();

      await expect(service.predecir(1, admin)).resolves.toMatchObject({
        peso_proyectado_faena_g: respuestaMl.peso_proyectado_faena_g,
      });
    });

    it('solo la mortalidad vencida: 200 con mortalidad_proyectada_pct null, omisiones, y el FCR conserva el supuesto de 0% de mortalidad', async () => {
      sembrarSerieCompleta();
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-10'), cantidad_aves: 5 },
        { fecha: new Date('2026-08-11'), cantidad_aves: 3 },
        { fecha: new Date('2026-08-12'), cantidad_aves: 2 },
      ]);
      const fetchMock = mockMlCompleto();
      global.fetch = fetchMock;

      const r = await service.predecir(1, admin);

      expect(r.mortalidad_proyectada_pct).toBeNull();
      expect(r.omisiones).toEqual([
        {
          magnitud: 'mortalidad',
          motivo: 'horizonte_vencido',
          ultimo_dia_observado: 43,
        },
      ]);
      // El consumo si se pudo proyectar, asi que el FCR sigue el supuesto
      // preexistente de 0% de mortalidad -- no queda en null.
      expect(r.fcr_proyectado).not.toBeNull();

      const llamadas = (fetchMock as unknown as jest.Mock).mock
        .calls as Array<[string]>;
      expect(
        llamadas.some(([url]) => url.includes('predecir-mortalidad')),
      ).toBe(false);
    });

    it('solo el consumo vencido: 200 con consumo_proyectado_kg null, FCR en null, y omisiones', async () => {
      sembrarSerieCompleta();
      prisma.consumoDiario.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-10'), alimento_kg: 3900 },
        { fecha: new Date('2026-08-11'), alimento_kg: 3950 },
        { fecha: new Date('2026-08-12'), alimento_kg: 4000 },
      ]);
      const fetchMock = mockMlCompleto();
      global.fetch = fetchMock;

      const r = await service.predecir(1, admin);

      expect(r.consumo_proyectado_kg).toBeNull();
      expect(r.fcr_proyectado).toBeNull();
      expect(r.omisiones).toEqual([
        {
          magnitud: 'consumo',
          motivo: 'horizonte_vencido',
          ultimo_dia_observado: 43,
        },
      ]);

      const llamadas = (fetchMock as unknown as jest.Mock).mock
        .calls as Array<[string]>;
      expect(
        llamadas.some(([url]) => url.includes('predecir-consumo')),
      ).toBe(false);
    });

    it('pesaje anterior al ingreso: se excluye antes de agrupar; si quedan menos de 3 dias, sigue el 400 actual', async () => {
      prisma.pesaje.findMany.mockResolvedValue([
        { fecha: new Date('2026-06-25'), peso_promedio_g: 999 },
        { fecha: new Date('2026-07-08'), peso_promedio_g: 180 },
        { fecha: new Date('2026-07-15'), peso_promedio_g: 500 },
      ]);

      await expect(service.predecir(1, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('pesaje anterior al ingreso: se excluye y se cuenta, sin romper la prediccion si sobran dias validos', async () => {
      prisma.pesaje.findMany.mockResolvedValue([
        { fecha: new Date('2026-06-25'), peso_promedio_g: 999 },
        ...tresPesajes,
      ]);
      mlResponde();

      const r = await service.predecir(1, admin);

      expect(r.pesajes_usados).toBe(3);
      expect(r.observaciones_descartadas).toMatchObject({ pesajes: 1 });
    });

    it('mortalidad anterior al ingreso: no entra al acumulado y se cuenta aparte', async () => {
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-06-25'), cantidad_aves: 100 },
        { fecha: new Date('2026-07-08'), cantidad_aves: 10 },
        { fecha: new Date('2026-07-15'), cantidad_aves: 5 },
        { fecha: new Date('2026-07-22'), cantidad_aves: 5 },
      ]);
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(respuestaMl),
      });
      global.fetch = fetchMock;

      const r = await service.predecir(1, admin);

      expect(r.observaciones_descartadas).toMatchObject({ mortalidades: 1 });
      const llamadas = fetchMock.mock.calls as Array<[string, { body: string }]>;
      const llamada = llamadas.find(([url]) =>
        url.includes('predecir-mortalidad'),
      );
      const cuerpo = JSON.parse(llamada![1].body) as {
        mortalidades: Array<{ dia: number; mortalidad_pct: number }>;
      };
      // Con cantidad_inicial=1000: si el registro anterior al ingreso (100
      // aves) entrara al acumulado, el primer punto seria 11% (100+10)/1000.
      // Excluido, el primer punto es 1% (solo los 10 del dia valido).
      expect(cuerpo.mortalidades[0].mortalidad_pct).toBe(1);
    });

    it('consumo anterior al ingreso: no entra al acumulado y se cuenta aparte', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue([
        { fecha: new Date('2026-06-25'), alimento_kg: 500 },
        { fecha: new Date('2026-07-08'), alimento_kg: 165 },
        { fecha: new Date('2026-07-15'), alimento_kg: 355 },
        { fecha: new Date('2026-07-22'), alimento_kg: 610 },
      ]);
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(respuestaMl),
      });
      global.fetch = fetchMock;

      const r = await service.predecir(1, admin);

      expect(r.observaciones_descartadas).toMatchObject({ consumos: 1 });
      const llamadas = fetchMock.mock.calls as Array<[string, { body: string }]>;
      const llamada = llamadas.find(([url]) =>
        url.includes('predecir-consumo'),
      );
      const cuerpo = JSON.parse(llamada![1].body) as {
        consumos: Array<{ dia: number; consumo_acum_kg: number }>;
      };
      // Si el registro anterior al ingreso (500 kg) entrara al acumulado, el
      // primer punto seria 665 kg (500+165). Excluido, es 165 kg.
      expect(cuerpo.consumos[0].consumo_acum_kg).toBe(165);
    });

    it('el ML caido sigue devolviendo el 400 actual, distinto del 422 de horizonte vencido', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      let error: unknown;
      try {
        await service.predecir(1, admin);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).not.toBeInstanceOf(UnprocessableEntityException);
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
