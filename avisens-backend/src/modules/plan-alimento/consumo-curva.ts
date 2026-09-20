import { Prisma } from '@prisma/client';

export const ALGORITMO_ACTUAL = 'consumo_acumulado_lineal_muerte_fin_dia_v1';

export interface PuntoConsumo {
  dia: number;
  consumoAcumuladoG: Prisma.Decimal;
}

export type ResultadoIntegracionAlimento =
  | { estado: 'sin_consumo_en_curva' }
  | { estado: 'consumo_insuficiente' }
  | { estado: 'consumo_fuera_de_rango' }
  | {
      estado: 'calculado';
      consumoPorAveG: Prisma.Decimal;
      consumoTotalKg: Prisma.Decimal;
    };

// Requiere puntos ordenados ascendentemente por dia (orderBy: { dia: 'asc' }),
// mismo precondition que resolverDiaObjetivo en plan-lote/interpolacion.ts.
function acumuladoEnDia(conAncla: PuntoConsumo[], dia: number): Prisma.Decimal {
  for (const punto of conAncla) {
    if (punto.dia === dia) return punto.consumoAcumuladoG;
  }
  for (let i = 0; i < conAncla.length - 1; i++) {
    const inferior = conAncla[i];
    const superior = conAncla[i + 1];
    if (dia > inferior.dia && dia < superior.dia) {
      return inferior.consumoAcumuladoG.plus(
        superior.consumoAcumuladoG
          .minus(inferior.consumoAcumuladoG)
          .div(superior.dia - inferior.dia)
          .mul(dia - inferior.dia),
      );
    }
  }
  throw new Error(`dia ${dia} fuera del rango interpolable`);
}

/**
 * Integra c(d) = acum(d) - acum(d-1) ponderado por avesVivasEnDia(d), para
 * d = 1..diaObjetivo. El ancla virtual (dia 0, 0 g) y la interpolacion
 * lineal entre puntos son aproximaciones propias de Avisens: el manual del
 * genetista no afirma que el consumo crezca linealmente entre edades
 * publicadas. Con puntos diarios cargados, cada dia cae exacto sobre un
 * punto y la aproximacion desaparece.
 *
 * La validacion de que consumo_acumulado_g no decrece ya la hace
 * CurvasGeneticasService.validarParaPublicar() al publicar la curva; esto
 * de aqui es defensa en profundidad, no una segunda fuente de verdad: si
 * llegan datos imposibles, falla explicito en vez de integrar en silencio.
 */
export function integrarConsumo(
  puntos: PuntoConsumo[],
  diaObjetivo: number,
  avesVivasEnDia: (dia: number) => number,
): ResultadoIntegracionAlimento {
  if (puntos.length === 0) return { estado: 'sin_consumo_en_curva' };
  if (puntos.length < 2) return { estado: 'consumo_insuficiente' };
  if (diaObjetivo > puntos[puntos.length - 1].dia) {
    return { estado: 'consumo_fuera_de_rango' };
  }

  const conAncla: PuntoConsumo[] = [
    { dia: 0, consumoAcumuladoG: new Prisma.Decimal(0) },
    ...puntos,
  ];

  let totalGramos = new Prisma.Decimal(0);
  let acumuladoAnterior = new Prisma.Decimal(0);
  for (let dia = 1; dia <= diaObjetivo; dia++) {
    const acumuladoHoy = acumuladoEnDia(conAncla, dia);
    const consumoDelDia = acumuladoHoy.minus(acumuladoAnterior);
    if (consumoDelDia.isNegative()) {
      throw new Error(
        `Consumo decreciente en el dia ${dia}: la curva no debio publicarse (ver CurvasGeneticasService.validarParaPublicar)`,
      );
    }
    totalGramos = totalGramos.plus(consumoDelDia.mul(avesVivasEnDia(dia)));
    acumuladoAnterior = acumuladoHoy;
  }

  return {
    estado: 'calculado',
    consumoPorAveG: acumuladoAnterior.toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_UP,
    ),
    consumoTotalKg: totalGramos
      .div(1000)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP),
  };
}
