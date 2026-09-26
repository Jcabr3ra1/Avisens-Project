import { diaDeVidaDeFecha } from '../../common/fechas/dias-de-vida';

export interface EntradaMortalidad {
  dia: number;
  muertes: number;
}

export interface RegistroMortalidadCrudo {
  fecha: Date;
  cantidadAves: number;
}

export type ViolacionMortalidad =
  | { caso: 'registro_no_positivo'; fecha: Date; cantidadAves: number }
  | { caso: 'mortalidad_antes_del_ingreso'; dia: number; muertes: number }
  | { caso: 'mortalidad_futura'; dia: number; muertes: number }
  | {
      caso: 'aves_negativas';
      dia: number;
      muertesAcumuladas: number;
      cantidadInicial: number;
    };

export type ResultadoMortalidad =
  | {
      valido: true;
      snapshot: EntradaMortalidad[];
      muertesAlCorte: number;
      avesVivasAlCorte: number;
    }
  | { valido: false; violaciones: ViolacionMortalidad[] };

/**
 * Clasifica TODOS los registros del lote, sin filtrar por fecha antes: un
 * registro futuro solo se detecta como tal si primero se lee y se convierte
 * a dia de vida. Filtrar la consulta por fecha_corte excluiria justo lo que
 * hay que rechazar.
 *
 * Recoge todas las violaciones encontradas, no solo la primera. Un INSERT
 * concurrente confirmado despues de leer estos `registros` simplemente no
 * entra en la foto -- eso es correcto, no una carrera a corregir.
 */
export function clasificarMortalidad(
  fechaIngreso: Date,
  registros: RegistroMortalidadCrudo[],
  diaCorte: number,
  cantidadInicial: number,
): ResultadoMortalidad {
  const violaciones: ViolacionMortalidad[] = [];
  const porDia = new Map<number, number>();

  for (const registro of registros) {
    if (registro.cantidadAves <= 0) {
      violaciones.push({
        caso: 'registro_no_positivo',
        fecha: registro.fecha,
        cantidadAves: registro.cantidadAves,
      });
      continue;
    }

    const dia = diaDeVidaDeFecha(fechaIngreso, registro.fecha);

    if (dia <= 0) {
      violaciones.push({
        caso: 'mortalidad_antes_del_ingreso',
        dia,
        muertes: registro.cantidadAves,
      });
      continue;
    }
    if (dia > diaCorte) {
      violaciones.push({
        caso: 'mortalidad_futura',
        dia,
        muertes: registro.cantidadAves,
      });
      continue;
    }

    porDia.set(dia, (porDia.get(dia) ?? 0) + registro.cantidadAves);
  }

  const snapshot = [...porDia.entries()]
    .sort(([diaA], [diaB]) => diaA - diaB)
    .map(([dia, muertes]) => ({ dia, muertes }));

  // Tras rechazar cantidadAves <= 0, "la suma excede cantidad_inicial" y
  // "N(d) se vuelve negativo" son equivalentes (M es no decreciente): un
  // solo caso, reportado en el primer dia donde ocurre.
  let acumulado = 0;
  for (const entrada of snapshot) {
    acumulado += entrada.muertes;
    if (acumulado > cantidadInicial) {
      violaciones.push({
        caso: 'aves_negativas',
        dia: entrada.dia,
        muertesAcumuladas: acumulado,
        cantidadInicial,
      });
      break;
    }
  }

  if (violaciones.length > 0) return { valido: false, violaciones };

  const muertesAlCorte = snapshot.reduce((total, e) => total + e.muertes, 0);
  return {
    valido: true,
    snapshot,
    muertesAlCorte,
    avesVivasAlCorte: cantidadInicial - muertesAlCorte,
  };
}

export interface ParametrosValidacionSnapshot {
  diaCorte: number;
  cantidadInicialSnapshot: number;
  muertesAlCorteEsperadas: number;
  avesVivasAlCorteEsperadas: number;
}

/**
 * Valida un mortalidad_snapshot ya persistido (o a punto de persistirse)
 * contra el contrato completo de Fase 2A. El CHECK de Postgres solo
 * garantiza que la columna sea un arreglo JSON -- NUNCA que sus elementos
 * tengan {dia, muertes}, que los dias sean enteros positivos <= dia_corte,
 * que esten ordenados sin repetirse, ni que la suma cuadre con
 * muertes_al_corte/aves_vivas_al_corte. Esas invariantes solo las puede
 * expresar codigo, no SQL (son un agregado entre elementos de un jsonb).
 *
 * Se usa en dos momentos: al escribir (defensa en profundidad -- si
 * clasificarMortalidad alguna vez rompe su propia invariante, esto lo
 * atrapa antes de persistir) y al leer (unica defensa real contra una
 * escritura SQL directa que deje un arreglo corrupto).
 */
export function validarSnapshotMortalidad(
  valor: unknown,
  params: ParametrosValidacionSnapshot,
): valor is EntradaMortalidad[] {
  if (!Array.isArray(valor)) return false;

  let diaAnterior = 0;
  let sumaMuertes = 0;

  for (const entrada of valor) {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada)
    ) {
      return false;
    }
    const { dia, muertes } = entrada as Record<string, unknown>;
    if (typeof dia !== 'number' || !Number.isInteger(dia)) return false;
    if (typeof muertes !== 'number' || !Number.isInteger(muertes)) {
      return false;
    }
    if (dia <= 0 || dia > params.diaCorte) return false;
    if (muertes <= 0) return false;
    if (dia <= diaAnterior) return false; // estrictamente creciente
    diaAnterior = dia;
    sumaMuertes += muertes;
  }

  if (sumaMuertes !== params.muertesAlCorteEsperadas) return false;
  if (
    params.cantidadInicialSnapshot - sumaMuertes !==
    params.avesVivasAlCorteEsperadas
  ) {
    return false;
  }

  return true;
}

/**
 * N(d) = cantidad_inicial - M(min(d-1, dia_corte)), convencion FIN DEL DIA,
 * aprobada: las muertes del dia d se descuentan desde d+1, porque
 * RegistroMortalidad solo guarda fecha, no hora, y asumir que el ave no
 * comio nada ese dia alegaria una precision horaria que el dato no tiene.
 * Es la aproximacion conservadora (sobrestima un poco, nunca falta).
 * version_algoritmo = consumo_acumulado_lineal_muerte_fin_dia_v1.
 */
export function avesVivasEnDia(
  snapshot: EntradaMortalidad[],
  cantidadInicial: number,
  diaCorte: number,
  dia: number,
): number {
  const corte = Math.min(dia - 1, diaCorte);
  const muertes = snapshot
    .filter((e) => e.dia <= corte)
    .reduce((total, e) => total + e.muertes, 0);
  return cantidadInicial - muertes;
}
