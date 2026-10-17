import { Prisma } from '@prisma/client';
import {
  ALGORITMO_ACTUAL,
  integrarConsumo,
  PuntoConsumo,
} from './consumo-curva';
import { repartirTotalPorCorte } from './desglose-por-corte';
import {
  avesVivasEnDia,
  EntradaMortalidad,
} from '../../common/mortalidad/mortalidad-snapshot';

function punto(dia: number, consumoAcumuladoG: number): PuntoConsumo {
  return { dia, consumoAcumuladoG: new Prisma.Decimal(consumoAcumuladoG) };
}

const PUNTOS = [punto(7, 140), punto(14, 490), punto(21, 1190)];
const OBJETIVO = 21;
const INICIAL = 1000;
const MORTALIDAD: EntradaMortalidad[] = [
  { dia: 3, muertes: 10 },
  { dia: 12, muertes: 30 },
];

function acumuladoPorAve(dia: number): number {
  const conAncla = [
    { dia: 0, g: 0 },
    ...PUNTOS.map((p) => ({ dia: p.dia, g: p.consumoAcumuladoG.toNumber() })),
  ];
  for (let i = 0; i < conAncla.length - 1; i++) {
    const a = conAncla[i];
    const b = conAncla[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      return a.g + ((b.g - a.g) * (dia - a.dia)) / (b.dia - a.dia);
    }
  }
  throw new Error(`dia ${dia} fuera de rango`);
}

function avesVivasIndependiente(dia: number, corte: number): number {
  const hasta = Math.min(dia - 1, corte);
  const muertas = MORTALIDAD.filter((m) => m.dia <= hasta).reduce(
    (t, m) => t + m.muertes,
    0,
  );
  return INICIAL - muertas;
}

function consumoIndependiente(
  desde: number,
  hasta: number,
  corte: number,
): number {
  let total = 0;
  for (let d = desde; d <= hasta; d++) {
    total +=
      ((acumuladoPorAve(d) - acumuladoPorAve(d - 1)) *
        avesVivasIndependiente(d, corte)) /
      1000;
  }
  return total;
}

function totalPersistido(corte: number): Prisma.Decimal {
  const r = integrarConsumo(PUNTOS, OBJETIVO, (d) =>
    avesVivasEnDia(MORTALIDAD, INICIAL, corte, d),
  );
  if (r.estado !== 'calculado') throw new Error('curva de prueba inválida');
  return r.consumoTotalKg;
}

function repartir(
  corte: number,
  extra: Partial<Parameters<typeof repartirTotalPorCorte>[0]> = {},
) {
  return repartirTotalPorCorte({
    versionAlgoritmo: ALGORITMO_ACTUAL,
    puntos: PUNTOS,
    diaObjetivo: OBJETIVO,
    mortalidadSnapshot: MORTALIDAD.filter((m) => m.dia <= corte),
    cantidadInicial: INICIAL,
    diaCorte: corte,
    consumoTotalKgPersistido: totalPersistido(corte),
    ...extra,
  });
}

describe('repartirTotalPorCorte', () => {
  it.each([1, 5, 7, 10, 13, 14, 18, 20])(
    'corte %i: hasta + pendiente = total y coincide con un cálculo independiente día a día',
    (corte) => {
      const r = repartir(corte);
      expect(r.disponible).toBe(true);
      if (!r.disponible) return;
      expect(
        r.hastaCorteKg.plus(r.pendienteTrasCorteKg).equals(r.totalKg),
      ).toBe(true);
      expect(r.hastaCorteKg.toNumber()).toBeCloseTo(
        consumoIndependiente(1, corte, corte),
        3,
      );
      expect(r.pendienteTrasCorteKg.toNumber()).toBeCloseTo(
        consumoIndependiente(corte + 1, OBJETIVO, corte),
        2,
      );
    },
  );

  it('corte dentro de un tramo de la curva (día 10 entre los puntos 7 y 14): el acumulado es interpolado, no el de un punto', () => {
    const r = repartir(10);
    if (!r.disponible) throw new Error('debía estar disponible');
    const enPunto7 = repartir(7);
    const enPunto14 = repartir(14);
    if (!enPunto7.disponible || !enPunto14.disponible) throw new Error('x');
    expect(r.hastaCorteKg.gt(enPunto7.hastaCorteKg)).toBe(true);
    expect(r.hastaCorteKg.lt(enPunto14.hastaCorteKg)).toBe(true);
  });

  it('corte 0 (ingreso futuro): nada consumido hasta el corte y todo el ciclo pendiente', () => {
    const r = repartir(0);
    if (!r.disponible) throw new Error('debía estar disponible');
    expect(r.hastaCorteKg.toString()).toBe('0');
    expect(r.pendienteTrasCorteKg.equals(r.totalKg)).toBe(true);
  });

  it('corte igual al objetivo: pendiente 0 real', () => {
    const r = repartir(OBJETIVO);
    if (!r.disponible) throw new Error('debía estar disponible');
    expect(r.hastaCorteKg.equals(r.totalKg)).toBe(true);
    expect(r.pendienteTrasCorteKg.toString()).toBe('0');
  });

  it('corte posterior al objetivo: hasta = total y pendiente 0, sin negativos', () => {
    const r = repartir(30);
    if (!r.disponible) throw new Error('debía estar disponible');
    expect(r.hastaCorteKg.equals(r.totalKg)).toBe(true);
    expect(r.pendienteTrasCorteKg.isNegative()).toBe(false);
    expect(r.pendienteTrasCorteKg.toString()).toBe('0');
  });

  it('versión de algoritmo distinta: no disponible, sin kilos inventados', () => {
    expect(repartir(10, { versionAlgoritmo: 'otro_v0' })).toEqual({
      disponible: false,
      motivo: 'algoritmo_distinto',
    });
  });

  it('curva sin puntos con consumo: no disponible', () => {
    expect(repartir(10, { puntos: [] })).toEqual({
      disponible: false,
      motivo: 'curva_no_disponible',
    });
  });

  it('total persistido que no se reproduce con los snapshots: no disponible', () => {
    expect(
      repartir(10, { consumoTotalKgPersistido: new Prisma.Decimal('1.000') }),
    ).toEqual({ disponible: false, motivo: 'total_no_reproducible' });
  });
});
