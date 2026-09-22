import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanAlimentoService } from './plan-alimento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanLoteService } from '../plan-lote/plan-lote.service';
import { ALGORITMO_ACTUAL } from './consumo-curva';

const admin = { id: 1, rol: 'Administrador' };
const propietario = { id: 5, rol: 'Propietario' };

const loteDePropietario = (propietarioId: number) => ({
  id: 3,
  galpon: { granja: { propietario_id: propietarioId } },
});

const filaLote = (overrides: Record<string, unknown> = {}) => ({
  estado: 'activo',
  cantidad_inicial: 1000,
  fecha_salida_real: null,
  marca_alimento: null,
  ...overrides,
});

// El reloj de la estimacion es SIEMPRE fecha_ingreso_snapshot del plan, nunca
// Lote.fecha_ingreso -- este ultimo es editable por PATCH despues de que el
// plan ya se calculo.
const filaPlan = (overrides: Record<string, unknown> = {}) => ({
  id: 31,
  estado_dia: 'calculado',
  dia_objetivo: 21,
  curva_version_id: 7,
  fecha_ingreso_snapshot: new Date('2026-07-30T00:00:00.000Z'),
  ...overrides,
});

const puntosCurva = [
  { dia: 7, consumo_acumulado_g: new Prisma.Decimal(140) },
  { dia: 14, consumo_acumulado_g: new Prisma.Decimal(490) },
  { dia: 21, consumo_acumulado_g: new Prisma.Decimal(1190) },
];

const planVigenteBase = {
  id: 31,
  version: 1,
  resultado: { dia_objetivo: 21 },
  desactualizado: false,
};

const dataDe = (mock: jest.Mock): Record<string, unknown> => {
  const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
  return calls[0][0].data;
};

// Lo que devuelve tx.estimacionAlimentoPlan.create({ select: ESTIMACION_SELECT }):
// mapearEstimacion() necesita las relaciones, no solo los ids planos.
const estimacionCreada = () => ({
  id: 1,
  plan_lote_id: 31,
  version: 1,
  vigente: true,
  estado_alimento: 'calculado',
  version_algoritmo: ALGORITMO_ACTUAL,
  cantidad_inicial_snapshot: 1000,
  dia_corte: 0,
  mortalidad_snapshot: [],
  muertes_al_corte: null,
  aves_vivas_al_corte: null,
  dia_objetivo_snapshot: null,
  consumo_por_ave_g: null,
  consumo_total_kg: null,
  estado_desglose: null,
  version_desglose: null,
  marca_alimento_snapshot: null,
  motivo: null,
  fecha_creacion: new Date('2026-08-08T00:00:00.000Z'),
  creado_por: { id: 1, nombre_completo: 'Admin' },
  plan: {
    id: 31,
    version: 1,
    lote_id: 3,
    fecha_ingreso_snapshot: new Date('2026-07-30T00:00:00.000Z'),
    fecha_salida_calculada: null,
  },
  curva_version_snapshot: null,
  renglones_alimento: [] as unknown[],
});

describe('PlanAlimentoService', () => {
  let service: PlanAlimentoService;

  const tx = {
    $queryRaw: jest.fn(),
    registroMortalidad: { findMany: jest.fn() },
    puntoCurvaGenetica: { findMany: jest.fn() },
    tipoAlimento: { findMany: jest.fn() },
    estimacionAlimentoPlan: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    lote: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    registroMortalidad: { findMany: jest.fn() },
    estimacionAlimentoPlan: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const planLoteService = {
    obtener: jest.fn(),
  };

  const conCallback = () => {
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanAlimentoService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanLoteService, useValue: planLoteService },
      ],
    }).compile();
    service = module.get<PlanAlimentoService>(PlanAlimentoService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.lote.findUnique.mockResolvedValue(loteDePropietario(5));
    planLoteService.obtener.mockResolvedValue(planVigenteBase);
    tx.tipoAlimento.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  describe('crear', () => {
    it('un Propietario no puede crear la estimación de un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteDePropietario(999));

      await expect(service.crear(3, {}, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe (leído dentro de la transacción)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza (409) si el lote está finalizado, sin llegar a leer planes_lote', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote({ estado: 'finalizado' })]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.estimacionAlimentoPlan.create).not.toHaveBeenCalled();
    });

    it('rechaza (409) si el lote está inactivo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote({ estado: 'inactivo' })]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza (409) si el lote tiene fecha_salida_real', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([
        filaLote({ fecha_salida_real: new Date('2026-09-01') }),
      ]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza (404) si el lote no tiene un plan vigente', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.estimacionAlimentoPlan.create).not.toHaveBeenCalled();
    });

    it('estado_alimento=plan_sin_dia_objetivo si el plan vigente no está calculado (no consulta mortalidad ni curva)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      const data = dataDe(tx.estimacionAlimentoPlan.create);
      expect(data.estado_alimento).toBe('plan_sin_dia_objetivo');
      expect(data.mortalidad_snapshot).toEqual(Prisma.DbNull);
      expect(data.dia_objetivo_snapshot).toBeNull();
      expect(data.curva_version_id_snapshot).toBeNull();
      expect(tx.registroMortalidad.findMany).not.toHaveBeenCalled();
      expect(tx.puntoCurvaGenetica.findMany).not.toHaveBeenCalled();
      expect(tx.tipoAlimento.findMany).not.toHaveBeenCalled();
      expect(data.estado_desglose).toBeNull();
      expect(data.version_desglose).toBeNull();
      expect(data.marca_alimento_snapshot).toBeNull();
      expect(data.renglones_alimento).toEqual({ create: [] });
    });

    it('estado_alimento=calculado: reproduce el ejemplo numérico verificado del diseño (1161.850 kg)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 15 }, // día 2
        { fecha: new Date('2026-08-03T00:00:00.000Z'), cantidad_aves: 10 }, // día 5
      ]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      const data = dataDe(tx.estimacionAlimentoPlan.create);
      expect(data.estado_alimento).toBe('calculado');
      expect(data.dia_corte).toBe(10);
      expect(data.version_algoritmo).toBe(ALGORITMO_ACTUAL);
      expect((data.consumo_total_kg as Prisma.Decimal).toFixed(3)).toBe(
        '1161.850',
      );
      expect((data.consumo_por_ave_g as Prisma.Decimal).toFixed(2)).toBe(
        '1190.00',
      );
      expect(data.muertes_al_corte).toBe(25);
      expect(data.aves_vivas_al_corte).toBe(975);
      expect(data.mortalidad_snapshot).toEqual([
        { dia: 2, muertes: 15 },
        { dia: 5, muertes: 10 },
      ]);
      // filaLote() no trae marca_alimento: el desglose de Fase 2B queda en
      // lote_sin_marca_alimento, sin tocar el total ya calculado arriba.
      expect(tx.tipoAlimento.findMany).toHaveBeenCalledWith({
        where: { activo: true, marca: { not: null } },
        select: {
          id: true,
          nombre: true,
          marca: true,
          etapa: true,
          dia_inicio: true,
          dia_fin: true,
        },
      });
      expect(data.estado_desglose).toBe('lote_sin_marca_alimento');
      expect(data.marca_alimento_snapshot).toBeNull();
      expect(data.renglones_alimento).toEqual({ create: [] });
    });

    it('estado_alimento=calculado con marca y catalogo: persiste el desglose como escritura anidada renglones_alimento.create', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([
        filaLote({ marca_alimento: 'italcol' }),
      ]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.tipoAlimento.findMany.mockResolvedValue([
        {
          id: 9,
          nombre: 'Unico',
          marca: 'ITALCOL',
          etapa: 'preiniciacion',
          dia_inicio: 1,
          dia_fin: 21,
        },
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      const data = dataDe(tx.estimacionAlimentoPlan.create);
      expect(data.estado_desglose).toBe('calculado');
      expect(data.marca_alimento_snapshot).toBe('italcol');
      expect(data.renglones_alimento).toEqual({
        create: [
          expect.objectContaining({
            orden: 1,
            tipo_alimento_id: 9,
            tipo_alimento_nombre_snapshot: 'Unico',
            etapa_snapshot: 'preiniciacion',
            dia_inicio: 1,
            dia_fin: 21,
            extendido_hasta_dia_objetivo: false,
          }),
        ],
      });
      const renglon = (
        data.renglones_alimento as { create: Array<Record<string, unknown>> }
      ).create[0];
      expect(
        (renglon.consumo_por_ave_g as Prisma.Decimal).toFixed(2),
      ).toBe('1190.00');
      // sin mortalidad registrada, N(d) = 1000 constante: 1190 g x 1000 aves.
      expect((renglon.consumo_total_kg as Prisma.Decimal).toFixed(3)).toBe(
        '1190.000',
      );
    });

    it('traduce una violacion de llave foranea (P2003) al insertar renglones a un 409', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([
        filaLote({ marca_alimento: 'italcol' }),
      ]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.tipoAlimento.findMany.mockResolvedValue([
        {
          id: 9,
          nombre: 'Unico',
          marca: 'italcol',
          etapa: 'preiniciacion',
          dia_inicio: 1,
          dia_fin: 21,
        },
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockRejectedValue({ code: 'P2003' });

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('estado_alimento=sin_consumo_en_curva si ningún punto tiene consumo_acumulado_g', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      const data = dataDe(tx.estimacionAlimentoPlan.create);
      expect(data.estado_alimento).toBe('sin_consumo_en_curva');
      expect(data.consumo_total_kg).toBeNull();
      // pero el snapshot de mortalidad SI se guarda: ya se leyo el lote/curva
      expect(data.mortalidad_snapshot).toEqual([]);
    });

    it('estado_alimento=consumo_insuficiente con un solo punto de consumo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([puntosCurva[0]]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      expect(dataDe(tx.estimacionAlimentoPlan.create).estado_alimento).toBe(
        'consumo_insuficiente',
      );
    });

    it('estado_alimento=consumo_fuera_de_rango si dia_objetivo excede el último punto con consumo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan({ dia_objetivo: 30 })]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      expect(dataDe(tx.estimacionAlimentoPlan.create).estado_alimento).toBe(
        'consumo_fuera_de_rango',
      );
    });

    it('rechaza (409) mortalidad incoherente, sin persistir ninguna fila', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([filaPlan()]);
      tx.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 2000 },
      ]);

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(tx.estimacionAlimentoPlan.updateMany).not.toHaveBeenCalled();
      expect(tx.estimacionAlimentoPlan.create).not.toHaveBeenCalled();
    });

    it('usa version 1 cuando no hay historial de estimaciones para el plan', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote({ cantidad_inicial: 0 })]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      expect(dataDe(tx.estimacionAlimentoPlan.create)).toMatchObject({
        version: 1,
      });
    });

    it('usa la version siguiente al maximo historico, nunca 1 fijo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue({ version: 3 });
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      expect(dataDe(tx.estimacionAlimentoPlan.create)).toMatchObject({
        version: 4,
      });
    });

    it('jubila el plan_lote_id correcto antes de crear la version nueva', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      expect(tx.estimacionAlimentoPlan.updateMany).toHaveBeenCalledWith({
        where: { plan_lote_id: 31, vigente: true },
        data: { vigente: false },
      });
    });

    it('traduce un choque de unicidad (P2002) a un 409', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.crear(3, {}, admin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('dia_corte=0 para un plan con fecha de ingreso futura (planificación)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-25T15:00:00.000Z'));
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          fecha_ingreso_snapshot: new Date('2026-08-01T00:00:00.000Z'),
        }),
      ]);
      tx.registroMortalidad.findMany.mockResolvedValue([]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      await service.crear(3, {}, admin);

      const data = dataDe(tx.estimacionAlimentoPlan.create);
      expect(data.dia_corte).toBe(0);
      expect(data.aves_vivas_al_corte).toBe(1000);
      expect(data.mortalidad_snapshot).toEqual([]);
    });

    it('incluye plan_vigente, desactualizado=false y efectiva=true en la respuesta', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValueOnce([filaLote()]);
      tx.$queryRaw.mockResolvedValueOnce([
        filaPlan({
          estado_dia: 'sin_curva',
          dia_objetivo: null,
          curva_version_id: null,
        }),
      ]);
      tx.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);
      tx.estimacionAlimentoPlan.create.mockResolvedValue(estimacionCreada());

      const res = await service.crear(3, {}, admin);

      expect(res.plan_vigente).toMatchObject({ id: 31, es_el_mismo: true });
      expect(res.desactualizado).toBe(false);
      expect(res.motivos_desactualizacion).toEqual([]);
      expect(res.efectiva).toBe(true);
      expect(res.antiguedad_dias).toBe(0);
    });
  });

  describe('obtener', () => {
    const filaEstimacion = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      plan_lote_id: 31,
      version: 1,
      vigente: true,
      estado_alimento: 'calculado',
      version_algoritmo: ALGORITMO_ACTUAL,
      cantidad_inicial_snapshot: 1000,
      dia_corte: 10,
      mortalidad_snapshot: [
        { dia: 2, muertes: 15 },
        { dia: 5, muertes: 10 },
      ],
      muertes_al_corte: 25,
      aves_vivas_al_corte: 975,
      dia_objetivo_snapshot: 21,
      consumo_por_ave_g: new Prisma.Decimal(1190),
      consumo_total_kg: new Prisma.Decimal('1161.850'),
      // Estas filas representan estimaciones anteriores a Fase 2B: el
      // backfill de la migracion las marca legado_sin_desglose (nunca se
      // reconstruye retroactivamente).
      estado_desglose: 'legado_sin_desglose',
      version_desglose: null,
      marca_alimento_snapshot: null,
      renglones_alimento: [] as unknown[],
      motivo: null,
      fecha_creacion: new Date('2026-08-08T00:00:00.000Z'),
      creado_por: { id: 1, nombre_completo: 'Admin' },
      plan: {
        id: 31,
        version: 1,
        lote_id: 3,
        fecha_ingreso_snapshot: new Date('2026-07-30T00:00:00.000Z'),
        fecha_salida_calculada: new Date('2026-08-19T00:00:00.000Z'),
      },
      curva_version_snapshot: {
        id: 7,
        sexo: 'macho',
        version: 1,
        fuente: 'test',
        linea_genetica: { id: 10, codigo: 'ross', nombre: 'Ross' },
      },
      ...overrides,
    });

    it('rechaza (404) si el lote no tiene ninguna estimación', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(null);

      await expect(service.obtener(3, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve la más reciente del lote aunque pertenezca a un plan jubilado', async () => {
      const estimacion = filaEstimacion({
        plan_lote_id: 20,
        plan: { ...filaEstimacion().plan, id: 20 },
      });
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(estimacion);
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      planLoteService.obtener.mockResolvedValue({
        ...planVigenteBase,
        id: 45, // el plan vigente ya no es el 20
      });

      const res = await service.obtener(3, admin);

      expect(res.plan.id).toBe(20);
      expect(res.plan_vigente).toMatchObject({ id: 45, es_el_mismo: false });
    });

    it('plan_vigente=null cuando el lote no tiene plan vigente (sin convertirse en 404 de toda la consulta)', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 15 },
        { fecha: new Date('2026-08-03T00:00:00.000Z'), cantidad_aves: 10 },
      ]);
      planLoteService.obtener.mockRejectedValue(
        new NotFoundException('sin plan vigente'),
      );
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.plan_vigente).toBeNull();
      expect(res.desactualizado).toBe(true);
      expect(res.motivos_desactualizacion).toContain('sin_plan_vigente');
    });

    it('propaga cualquier error de PlanLoteService.obtener() que no sea 404', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      planLoteService.obtener.mockRejectedValue(new ForbiddenException());

      await expect(service.obtener(3, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('motivo cantidad_inicial_cambio si el lote cambió su cantidad inicial', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 900,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desactualizado).toBe(true);
      expect(res.motivos_desactualizacion).toContain('cantidad_inicial_cambio');
    });

    it('motivo algoritmo_cambio si version_algoritmo ya no es el actual', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion({ version_algoritmo: 'version_vieja_v0' }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.motivos_desactualizacion).toContain('algoritmo_cambio');
    });

    it('motivo mortalidad_cambio si la distribución por día cambió (mismo total, otro reparto)', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      // snapshot original: dia 2 -> 15, dia 5 -> 10 (total 25). Ahora las 25
      // estan repartidas distinto: dia 3 -> 25. Misma suma, otro reparto.
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-01T00:00:00.000Z'), cantidad_aves: 25 },
      ]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.motivos_desactualizacion).toContain('mortalidad_cambio');
    });

    it('desactualizado=false cuando solo pasa el tiempo, sin cambios de mortalidad', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      // Misma mortalidad que el snapshot original.
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 15 },
        { fecha: new Date('2026-08-03T00:00:00.000Z'), cantidad_aves: 10 },
      ]);
      // Varios dias despues del corte original (dia 10), pero antes de D-1=20.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-15T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desactualizado).toBe(false);
      expect(res.motivos_desactualizacion).toEqual([]);
    });

    it('motivo mortalidad_actual_incoherente si la mortalidad actual ya no es reconstruible, sin convertir el GET en 409', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 2000 },
      ]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desactualizado).toBe(true);
      expect(res.motivos_desactualizacion).toEqual([
        'mortalidad_actual_incoherente',
      ]);
    });

    it('una mortalidad real posterior a D-1 pero anterior a hoy NO marca mortalidad_actual_incoherente ni mortalidad_cambio (bug de d_rel como corte de validacion)', async () => {
      // dia_objetivo_snapshot=21 -> D-1=20. Una muerte real en el dia 25 es
      // historica y valida (ya paso, es anterior a "hoy"), pero queda fuera
      // de la ventana de comparacion (dRel=20). Con el bug corregido, esto
      // NO debe reportarse como mortalidad_futura durante la validacion --
      // solo se excluye de la COMPARACION, nunca de la validacion.
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 15 }, // dia 2 (igual al snapshot)
        { fecha: new Date('2026-08-03T00:00:00.000Z'), cantidad_aves: 10 }, // dia 5 (igual al snapshot)
        { fecha: new Date('2026-08-23T00:00:00.000Z'), cantidad_aves: 5 }, // dia 25: > D-1, real, valida
      ]);
      // "hoy" = dia 30 de vida: muy despues del dia 25, para que sea
      // inequivocamente pasado, no mortalidad_futura.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-28T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desactualizado).toBe(false);
      expect(res.motivos_desactualizacion).toEqual([]);
    });

    it('no compara mortalidad cuando la estimación es plan_sin_dia_objetivo (sin snapshot que reconstruir)', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion({
          estado_alimento: 'plan_sin_dia_objetivo',
          dia_objetivo_snapshot: null,
          mortalidad_snapshot: null,
        }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });

      await service.obtener(3, admin);

      expect(prisma.registroMortalidad.findMany).not.toHaveBeenCalled();
    });

    it('efectiva=true siempre en el GET singular', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.efectiva).toBe(true);
    });

    it('un mortalidad_snapshot persistido corrupto falla como 500 controlado, nunca como mortalidad_actual_incoherente', async () => {
      // El CHECK de Postgres solo garantiza "es un arreglo JSON" -- una
      // escritura SQL directa pudo dejar esto, que cumple esa unica regla
      // pero no el contrato (dia deberia ser un entero).
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion({
          mortalidad_snapshot: [{ dia: 'dos', muertes: 10 }],
        }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      // La mortalidad ACTUAL (registros reales) es intachable: el problema
      // es solo el snapshot ya persistido, que se valida al reconstruirlo
      // para la comparacion.
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      await expect(service.obtener(3, admin)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('desglose.no_disponible=true para una estimacion anterior a Fase 2B (legado_sin_desglose), sin renglones', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion(),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desglose.no_disponible).toBe(true);
      expect(res.desglose.estado).toBe('legado_sin_desglose');
      expect(res.desglose.renglones).toEqual([]);
    });

    it('surfaces los renglones de una estimacion calculada bajo Fase 2B', async () => {
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion({
          estado_desglose: 'calculado',
          version_desglose: 'desglose_etapas_rango_dias_v1',
          marca_alimento_snapshot: 'italcol',
          renglones_alimento: [
            {
              orden: 1,
              tipo_alimento_id: 9,
              tipo_alimento_nombre_snapshot: 'Unico',
              etapa_snapshot: 'preiniciacion',
              dia_inicio: 1,
              dia_fin: 21,
              extendido_hasta_dia_objetivo: false,
              consumo_por_ave_g: new Prisma.Decimal(1190),
              consumo_total_kg: new Prisma.Decimal('1161.850'),
            },
          ],
        }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: new Date('2026-07-31T00:00:00.000Z'), cantidad_aves: 15 },
        { fecha: new Date('2026-08-03T00:00:00.000Z'), cantidad_aves: 10 },
      ]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      const res = await service.obtener(3, admin);

      expect(res.desglose.no_disponible).toBe(false);
      expect(res.desglose.marca_alimento_snapshot).toBe('italcol');
      expect(res.desglose.renglones).toEqual([
        expect.objectContaining({
          orden: 1,
          tipo_alimento_id: 9,
          tipo_alimento_nombre_snapshot: 'Unico',
          etapa: 'preiniciacion',
          dia_inicio: 1,
          dia_fin: 21,
        }),
      ]);
    });

    it('un desglose persistido corrupto (renglones que no cuadran) falla como 500 controlado', async () => {
      // Solape entre renglones: dos filas reclaman el dia 5. El CHECK por
      // fila no lo detecta -- solo la validacion agregada, al leer.
      prisma.estimacionAlimentoPlan.findFirst.mockResolvedValue(
        filaEstimacion({
          estado_desglose: 'calculado',
          version_desglose: 'desglose_etapas_rango_dias_v1',
          marca_alimento_snapshot: 'italcol',
          renglones_alimento: [
            {
              orden: 1,
              tipo_alimento_id: 9,
              tipo_alimento_nombre_snapshot: 'Preiniciador',
              etapa_snapshot: 'preiniciacion',
              dia_inicio: 1,
              dia_fin: 5,
              extendido_hasta_dia_objetivo: false,
              consumo_por_ave_g: new Prisma.Decimal(500),
              consumo_total_kg: new Prisma.Decimal('0.500'),
            },
            {
              orden: 2,
              tipo_alimento_id: 10,
              tipo_alimento_nombre_snapshot: 'Iniciador',
              etapa_snapshot: 'iniciacion',
              dia_inicio: 5,
              dia_fin: 21,
              extendido_hasta_dia_objetivo: true,
              consumo_por_ave_g: new Prisma.Decimal(690),
              consumo_total_kg: new Prisma.Decimal('0.661850'),
            },
          ],
        }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        cantidad_inicial: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T15:00:00.000Z'));

      await expect(service.obtener(3, admin)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('historial', () => {
    it('un Propietario no puede ver el historial de un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteDePropietario(999));

      await expect(
        service.historial(3, { page: 1, limit: 20 }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });

    it('marca efectiva=true solo en la fila globalmente mas reciente, sin consultas por fila', async () => {
      const filaA = {
        id: 2,
        plan_lote_id: 31,
        version: 2,
        vigente: true,
        estado_alimento: 'calculado',
        version_algoritmo: ALGORITMO_ACTUAL,
        cantidad_inicial_snapshot: 1000,
        dia_corte: 10,
        mortalidad_snapshot: [],
        muertes_al_corte: 0,
        aves_vivas_al_corte: 1000,
        dia_objetivo_snapshot: 21,
        consumo_por_ave_g: new Prisma.Decimal(1190),
        consumo_total_kg: new Prisma.Decimal(1190),
        estado_desglose: 'legado_sin_desglose',
        version_desglose: null,
        marca_alimento_snapshot: null,
        renglones_alimento: [] as unknown[],
        motivo: null,
        fecha_creacion: new Date('2026-08-08T00:00:00.000Z'),
        creado_por: { id: 1, nombre_completo: 'Admin' },
        plan: {
          id: 31,
          version: 2,
          lote_id: 3,
          fecha_salida_calculada: new Date('2026-08-19T00:00:00.000Z'),
        },
        curva_version_snapshot: null,
      };
      const filaB = { ...filaA, id: 1, version: 1 };

      prisma.$transaction.mockResolvedValueOnce([
        [filaA, filaB],
        2,
        { id: filaA.id },
      ]);

      const res = await service.historial(3, { page: 1, limit: 20 }, admin);

      expect(
        res.data.find((e: { id: number }) => e.id === filaA.id)?.efectiva,
      ).toBe(true);
      expect(
        res.data.find((e: { id: number }) => e.id === filaB.id)?.efectiva,
      ).toBe(false);
      expect(res.meta.total).toBe(2);
      expect(prisma.registroMortalidad.findMany).not.toHaveBeenCalled();
    });

    it('una pagina puede tener cero filas efectiva=true (la efectiva quedo en otra pagina)', async () => {
      const fila = {
        id: 5,
        plan_lote_id: 31,
        version: 1,
        vigente: false,
        estado_alimento: 'calculado',
        version_algoritmo: ALGORITMO_ACTUAL,
        cantidad_inicial_snapshot: 1000,
        dia_corte: 10,
        mortalidad_snapshot: [],
        muertes_al_corte: 0,
        aves_vivas_al_corte: 1000,
        dia_objetivo_snapshot: 21,
        consumo_por_ave_g: new Prisma.Decimal(1190),
        consumo_total_kg: new Prisma.Decimal(1190),
        estado_desglose: 'legado_sin_desglose',
        version_desglose: null,
        marca_alimento_snapshot: null,
        renglones_alimento: [] as unknown[],
        motivo: null,
        fecha_creacion: new Date('2026-08-08T00:00:00.000Z'),
        creado_por: { id: 1, nombre_completo: 'Admin' },
        plan: {
          id: 31,
          version: 1,
          lote_id: 3,
          fecha_salida_calculada: null,
        },
        curva_version_snapshot: null,
      };

      // la efectiva (id 99) esta en otra pagina.
      prisma.$transaction.mockResolvedValueOnce([[fila], 10, { id: 99 }]);

      const res = await service.historial(3, { page: 2, limit: 1 }, admin);

      expect(res.data.every((e: { efectiva: boolean }) => !e.efectiva)).toBe(
        true,
      );
    });
  });
});
