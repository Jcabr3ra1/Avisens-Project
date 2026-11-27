import { Prisma } from '@prisma/client';

export interface PuntoInterpolacion {
  dia: number;
  pesoEsperadoG: Prisma.Decimal;
}

export type ResultadoInterpolacion =
  | {
      estado: 'calculado';
      diaObjetivo: number;
      diaObjetivoInterpolado: Prisma.Decimal;
    }
  | { estado: 'fuera_de_rango' }
  | { estado: 'datos_insuficientes' };

// Requiere puntos ordenados ascendentemente por dia (orderBy: { dia: 'asc' }).
export function resolverDiaObjetivo(
  puntos: PuntoInterpolacion[],
  pesoObjetivoG: Prisma.Decimal,
): ResultadoInterpolacion {
  if (puntos.length < 2) {
    return { estado: 'datos_insuficientes' };
  }

  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];

  if (
    pesoObjetivoG.lt(primero.pesoEsperadoG) ||
    pesoObjetivoG.gt(ultimo.pesoEsperadoG)
  ) {
    return { estado: 'fuera_de_rango' };
  }

  for (const punto of puntos) {
    if (pesoObjetivoG.equals(punto.pesoEsperadoG)) {
      return {
        estado: 'calculado',
        diaObjetivo: punto.dia,
        diaObjetivoInterpolado: new Prisma.Decimal(punto.dia).toDecimalPlaces(
          6,
          Prisma.Decimal.ROUND_HALF_UP,
        ),
      };
    }
  }

  for (let i = 0; i < puntos.length - 1; i++) {
    const inferior = puntos[i];
    const superior = puntos[i + 1];

    if (
      pesoObjetivoG.gt(inferior.pesoEsperadoG) &&
      pesoObjetivoG.lt(superior.pesoEsperadoG)
    ) {
      const diaInterpolado = new Prisma.Decimal(inferior.dia).plus(
        pesoObjetivoG
          .minus(inferior.pesoEsperadoG)
          .div(superior.pesoEsperadoG.minus(inferior.pesoEsperadoG))
          .mul(superior.dia - inferior.dia),
      );

      return {
        estado: 'calculado',
        diaObjetivo: diaInterpolado.ceil().toNumber(),
        diaObjetivoInterpolado: diaInterpolado.toDecimalPlaces(
          6,
          Prisma.Decimal.ROUND_HALF_UP,
        ),
      };
    }
  }

  return { estado: 'fuera_de_rango' };
}
