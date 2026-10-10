import { Prisma } from '@prisma/client';
import {
  avesVivasEnDia,
  EntradaMortalidad,
} from '../../common/mortalidad/mortalidad-snapshot';
import {
  ALGORITMO_ACTUAL,
  integrarConsumo,
  PuntoConsumo,
} from './consumo-curva';

export type MotivoNoDisponible =
  | 'estado_alimento_no_calculado'
  | 'algoritmo_distinto'
  | 'curva_no_disponible'
  | 'total_no_reproducible';

export interface EntradaReparto {
  versionAlgoritmo: string;
  puntos: PuntoConsumo[];
  diaObjetivo: number;
  mortalidadSnapshot: EntradaMortalidad[];
  cantidadInicial: number;
  diaCorte: number;
  consumoTotalKgPersistido: Prisma.Decimal;
}

export type RepartoPorCorte =
  | {
      disponible: true;
      totalKg: Prisma.Decimal;
      hastaCorteKg: Prisma.Decimal;
      pendienteTrasCorteKg: Prisma.Decimal;
    }
  | { disponible: false; motivo: MotivoNoDisponible };

export function repartirTotalPorCorte(
  entrada: EntradaReparto,
): RepartoPorCorte {
  if (entrada.versionAlgoritmo !== ALGORITMO_ACTUAL) {
    return { disponible: false, motivo: 'algoritmo_distinto' };
  }

  const resultado = integrarConsumo(
    entrada.puntos,
    entrada.diaObjetivo,
    (dia) =>
      avesVivasEnDia(
        entrada.mortalidadSnapshot,
        entrada.cantidadInicial,
        entrada.diaCorte,
        dia,
      ),
  );
  if (resultado.estado !== 'calculado') {
    return { disponible: false, motivo: 'curva_no_disponible' };
  }
  if (!resultado.consumoTotalKg.equals(entrada.consumoTotalKgPersistido)) {
    return { disponible: false, motivo: 'total_no_reproducible' };
  }

  const diaDeCorte = Math.min(entrada.diaCorte, entrada.diaObjetivo);
  const hastaCorteKg = resultado
    .acumuladoTotalKgEnDia(diaDeCorte)
    .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

  return {
    disponible: true,
    totalKg: entrada.consumoTotalKgPersistido,
    hastaCorteKg,
    pendienteTrasCorteKg: entrada.consumoTotalKgPersistido.minus(hastaCorteKg),
  };
}
