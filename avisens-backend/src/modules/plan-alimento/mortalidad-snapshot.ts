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
