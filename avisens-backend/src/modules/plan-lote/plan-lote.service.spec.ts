import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanLoteService } from './plan-lote.service';
import { PrismaService } from '../../prisma/prisma.service';

const admin = { id: 1, rol: 'Administrador' };
const propietario = { id: 5, rol: 'Propietario' };

const loteDePropietario = (propietarioId: number) => ({
  id: 3,
  galpon: { granja: { propietario_id: propietarioId } },
});

// dia 35 coincide EXACTO con un punto (peso 2500): permite afirmar el dia y
// el redondeo sin depender de la interpolacion fraccionaria (ya cubierta en
// interpolacion.spec.ts).
const filaLote = (overrides: Record<string, unknown> = {}) => ({
  linea_genetica_id: 10,
  sexo: 'macho',
  fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
  ...overrides,
});

const puntosCurva = [
  { dia: 1, peso_esperado_g: new Prisma.Decimal(100) },
  { dia: 35, peso_esperado_g: new Prisma.Decimal(2500) },
  { dia: 42, peso_esperado_g: new Prisma.Decimal(3000) },
];

const dataDe = (mock: jest.Mock): Record<string, unknown> => {
  const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
  return calls[0][0].data;
};
const whereDe = (mock: jest.Mock): Record<string, unknown> => {
  const calls = mock.mock.calls as Array<[{ where: Record<string, unknown> }]>;
  return calls[0][0].where;
};

describe('PlanLoteService', () => {
  let service: PlanLoteService;

  const tx = {
    $queryRaw: jest.fn(),
    planLote: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    curvaGeneticaVersion: { findFirst: jest.fn() },
    puntoCurvaGenetica: { findMany: jest.fn() },
  };

  const prisma = {
    lote: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    planLote: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    curvaGeneticaVersion: { findFirst: jest.fn() },
    $transaction: jest.fn(),
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
        PlanLoteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PlanLoteService>(PlanLoteService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.lote.findUnique.mockResolvedValue(loteDePropietario(5));
    prisma.lote.findFirst.mockResolvedValue({ id: 3 });
  });

  describe('crear', () => {
    it('un Propietario no puede crear un plan para un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteDePropietario(999));

      await expect(
        service.crear(3, { peso_objetivo_g: 2500 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe (leido dentro de la transaccion)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.crear(3, { peso_objetivo_g: 2500 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(tx.planLote.create).not.toHaveBeenCalled();
    });

    it('estado_dia=calculado con curva vigente y objetivo dentro de rango', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('calculado');
      expect(data.curva_version_id).toBe(7);
      expect(data.dia_objetivo).toBe(35);
      expect((data.dia_objetivo_interpolado as Prisma.Decimal).toFixed(6)).toBe(
        '35.000000',
      );
      expect(data.fecha_salida_calculada).toEqual(
        new Date('2026-09-02T00:00:00.000Z'),
      );
    });

    it('estado_dia=sin_curva si el lote no tiene linea genetica (no consulta curvas)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('sin_curva');
      expect(data.curva_version_id).toBeNull();
      expect(data.dia_objetivo).toBeNull();
      expect(tx.curvaGeneticaVersion.findFirst).not.toHaveBeenCalled();
    });

    it('estado_dia=sin_curva si no hay curva vigente para linea+sexo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue(null);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('sin_curva');
      expect(data.curva_version_id).toBeNull();
      expect(tx.puntoCurvaGenetica.findMany).not.toHaveBeenCalled();
    });

    it('estado_dia=fuera_de_rango si el objetivo excede el ultimo peso de la curva', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 5000 }, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('fuera_de_rango');
      expect(data.curva_version_id).toBe(7);
      expect(data.dia_objetivo).toBeNull();
      expect(data.dia_objetivo_interpolado).toBeNull();
      expect(data.fecha_salida_calculada).toBeNull();
    });

    it('estado_dia=datos_insuficientes si la curva vigente tiene menos de 2 puntos', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([puntosCurva[0]]);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('datos_insuficientes');
      expect(data.curva_version_id).toBe(7);
      expect(data.dia_objetivo).toBeNull();
    });

    it('toma el peso del DTO y snapshotea linea/sexo/fecha_ingreso del lote bloqueado', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, propietario);

      const data = dataDe(tx.planLote.create);
      expect((data.peso_objetivo_g as Prisma.Decimal).toString()).toBe('2500');
      expect(data.linea_genetica_id_snapshot).toBe(10);
      expect(data.sexo_curva_snapshot).toBe('macho');
      expect(data.fecha_ingreso_snapshot).toEqual(
        new Date('2026-07-30T00:00:00.000Z'),
      );
      expect(data.creado_por_id).toBe(propietario.id);
    });

    it('resuelve un sexo nulo del lote como mixto', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ sexo: null })]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue(null);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      expect(whereDe(tx.curvaGeneticaVersion.findFirst)).toMatchObject({
        sexo: 'mixto',
      });
    });

    it('usa version 1 cuando no hay historial de planes para el lote', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      expect(dataDe(tx.planLote.create)).toMatchObject({ version: 1 });
    });

    it('usa la version siguiente al maximo historico, nunca 1 fijo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValue({ version: 4 });
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      expect(dataDe(tx.planLote.create)).toMatchObject({ version: 5 });
    });

    it('retira el plan vigente anterior antes de crear la version nueva', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValue({ version: 1 });
      tx.planLote.create.mockResolvedValue({ id: 1 });

      await service.crear(3, { peso_objetivo_g: 2500 }, admin);

      expect(tx.planLote.updateMany).toHaveBeenCalledWith({
        where: { lote_id: 3, vigente: true },
        data: { vigente: false },
      });
    });

    it('traduce un choque de unicidad (P2002, carrera dentro del lock) a un 409', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValue(null);
      tx.planLote.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.crear(3, { peso_objetivo_g: 2500 }, admin),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recalcular', () => {
    it('rechaza (404) si el lote no tiene un plan vigente que recalcular', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst.mockResolvedValueOnce(null);

      await expect(service.recalcular(3, {}, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.planLote.create).not.toHaveBeenCalled();
    });

    it('reusa el peso_objetivo_g del plan vigente, no uno nuevo', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote({ linea_genetica_id: null })]);
      tx.planLote.findFirst
        .mockResolvedValueOnce({ peso_objetivo_g: new Prisma.Decimal(2500) })
        .mockResolvedValueOnce({ version: 1 });
      tx.planLote.create.mockResolvedValue({ id: 2 });

      await service.recalcular(3, { motivo: 'ajuste' }, admin);

      const data = dataDe(tx.planLote.create);
      expect((data.peso_objetivo_g as Prisma.Decimal).toString()).toBe('2500');
      expect(data.motivo).toBe('ajuste');
      expect(data.version).toBe(2);
    });

    it('recalcula contra el estado actual del lote (linea/curva ya no la misma)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([filaLote()]);
      tx.planLote.findFirst
        .mockResolvedValueOnce({ peso_objetivo_g: new Prisma.Decimal(2500) })
        .mockResolvedValueOnce({ version: 1 });
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });
      tx.puntoCurvaGenetica.findMany.mockResolvedValue(puntosCurva);
      tx.planLote.create.mockResolvedValue({ id: 2 });

      await service.recalcular(3, {}, admin);

      const data = dataDe(tx.planLote.create);
      expect(data.estado_dia).toBe('calculado');
      expect(data.curva_version_id).toBe(7);
    });
  });

  describe('obtener', () => {
    const planVigente = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      lote_id: 3,
      linea_genetica_snapshot: { id: 10, codigo: 'ross', nombre: 'Ross' },
      sexo_curva_snapshot: 'macho',
      fecha_ingreso_snapshot: new Date('2026-07-30T00:00:00.000Z'),
      curva_version: {
        id: 7,
        sexo: 'macho',
        version: 1,
        fuente: 'test',
        linea_genetica: { id: 10, codigo: 'ross', nombre: 'Ross' },
      },
      estado_dia: 'calculado',
      ...overrides,
    });

    it('rechaza (404) si el lote no tiene un plan vigente', async () => {
      prisma.planLote.findFirst.mockResolvedValue(null);

      await expect(service.obtener(3, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('desactualizado=false cuando nada cambio desde que se calculo el plan', async () => {
      prisma.planLote.findFirst.mockResolvedValue(planVigente());
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });
      prisma.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 7 });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(false);
    });

    it('desactualizado=true si cambio la linea genetica del lote', async () => {
      prisma.planLote.findFirst.mockResolvedValue(planVigente());
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 99,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(true);
      expect(prisma.curvaGeneticaVersion.findFirst).not.toHaveBeenCalled();
    });

    it('desactualizado=true si cambio el sexo resuelto del lote', async () => {
      prisma.planLote.findFirst.mockResolvedValue(planVigente());
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'hembra',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(true);
    });

    it('desactualizado=true si cambio la fecha de ingreso del lote', async () => {
      prisma.planLote.findFirst.mockResolvedValue(planVigente());
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-08-01T00:00:00.000Z'),
      });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(true);
    });

    it('desactualizado=true si la curva vigente compatible ya no es la misma', async () => {
      prisma.planLote.findFirst.mockResolvedValue(planVigente());
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });
      prisma.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 8 });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(true);
    });

    it('desactualizado=true si un plan sin_curva ahora tiene una curva vigente disponible', async () => {
      prisma.planLote.findFirst.mockResolvedValue(
        planVigente({ estado_dia: 'sin_curva', curva_version: null }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });
      prisma.curvaGeneticaVersion.findFirst.mockResolvedValue({ id: 9 });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(true);
    });

    it('desactualizado=false si sigue sin haber curva vigente para un plan sin_curva', async () => {
      prisma.planLote.findFirst.mockResolvedValue(
        planVigente({ estado_dia: 'sin_curva', curva_version: null }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: 10,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });
      prisma.curvaGeneticaVersion.findFirst.mockResolvedValue(null);

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(false);
    });

    it('desactualizado=false si el lote nunca tuvo linea genetica y sigue sin ella', async () => {
      prisma.planLote.findFirst.mockResolvedValue(
        planVigente({
          linea_genetica_snapshot: null,
          estado_dia: 'sin_curva',
          curva_version: null,
        }),
      );
      prisma.lote.findUniqueOrThrow.mockResolvedValue({
        linea_genetica_id: null,
        sexo: 'macho',
        fecha_ingreso: new Date('2026-07-30T00:00:00.000Z'),
      });

      const res = await service.obtener(3, admin);
      expect(res.desactualizado).toBe(false);
      expect(prisma.curvaGeneticaVersion.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('historial', () => {
    it('un Propietario no puede ver el historial de un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteDePropietario(999));

      await expect(
        service.historial(3, { page: 1, limit: 20 }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });

    it('pagina resultados mapeados (curva/snapshot/creado_por) sin desactualizado ni consultas por fila', async () => {
      const filaPlan = (id: number, version: number) => ({
        id,
        lote_id: 3,
        version,
        vigente: version === 2,
        peso_objetivo_g: new Prisma.Decimal(2500),
        estado_dia: 'calculado',
        motivo: null,
        fecha_creacion: new Date('2026-09-18T00:00:00.000Z'),
        creado_por: { id: 1, nombre_completo: 'Admin' },
        linea_genetica_snapshot: { id: 10, codigo: 'ross', nombre: 'Ross' },
        sexo_curva_snapshot: 'macho',
        fecha_ingreso_snapshot: new Date('2026-07-30T00:00:00.000Z'),
        curva_version: {
          id: 7,
          sexo: 'macho',
          version: 1,
          fuente: 'test',
          linea_genetica: { id: 10, codigo: 'ross', nombre: 'Ross' },
        },
        dia_objetivo: 35,
        dia_objetivo_interpolado: new Prisma.Decimal(35),
        fecha_salida_calculada: new Date('2026-09-02T00:00:00.000Z'),
      });
      prisma.$transaction.mockResolvedValueOnce([
        [filaPlan(2, 2), filaPlan(1, 1)],
        2,
      ]);

      const res = await service.historial(3, { page: 1, limit: 20 }, admin);

      expect(res.data).toHaveLength(2);
      expect(res.data[0]).not.toHaveProperty('desactualizado');
      expect(res.data[0].curva).toMatchObject({
        version_id: 7,
        linea_genetica: { id: 10, codigo: 'ross', nombre: 'Ross' },
      });
      expect(res.data[0].snapshot).toMatchObject({
        linea_genetica: { id: 10, codigo: 'ross', nombre: 'Ross' },
        sexo_curva: 'macho',
      });
      expect(res.data[0].creado_por).toEqual({
        id: 1,
        nombre_completo: 'Admin',
      });
      expect(prisma.lote.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.curvaGeneticaVersion.findFirst).not.toHaveBeenCalled();
      expect(res.meta.total).toBe(2);
    });
  });
});
