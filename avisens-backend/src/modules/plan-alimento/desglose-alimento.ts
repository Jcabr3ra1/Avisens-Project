import { Prisma, EstadoDesgloseAlimento } from '@prisma/client';
import {
  normalizarMarcaCatalogo,
  ETAPAS_ALIMENTACION,
} from '../../common/avicultura/vocabulario';

export interface RenglonDesglose {
  orden: number;
  tipoAlimentoId: number | null;
  tipoAlimentoNombreSnapshot: string | null;
  etapaSnapshot: string | null;
  diaInicio: number;
  diaFin: number;
  extendidoHastaDiaObjetivo: boolean;
  consumoPorAveG: Prisma.Decimal;
  consumoTotalKg: Prisma.Decimal;
}

export interface ParametrosValidacionDesglose {
  estadoDesglose: EstadoDesgloseAlimento | null;
  diaObjetivoSnapshot: number | null;
  consumoPorAveGEsperado: Prisma.Decimal | null;
  consumoTotalKgEsperado: Prisma.Decimal | null;
}

const ESTADOS_SIN_RENGLONES: (EstadoDesgloseAlimento | null)[] = [
  null,
  'legado_sin_desglose',
  'lote_sin_marca_alimento',
  'marca_sin_catalogo',
  'catalogo_invalido',
  'catalogo_ambiguo',
];

/**
 * Valida un desglose completo contra el contrato de Fase 2B. El CHECK de
 * Postgres solo cubre invariantes escalares por fila -- NUNCA cobertura,
 * ausencia de solapes, cantidad de renglones sinteticos por estado, ni las
 * dos sumas contra el total ya persistido por 2A. Esas invariantes son
 * entre filas y solo el codigo las puede expresar.
 *
 * Se usa en dos momentos: al escribir (defensa en profundidad -- si la
 * maquina de estados alguna vez rompe su propia invariante, esto lo atrapa
 * antes de persistir) y al leer (unica defensa real contra una escritura SQL
 * directa que deje un desglose incoherente).
 */
export function validarDesgloseAlimento(
  renglones: RenglonDesglose[],
  params: ParametrosValidacionDesglose,
): boolean {
  if (ESTADOS_SIN_RENGLONES.includes(params.estadoDesglose)) {
    return renglones.length === 0;
  }

  if (
    params.diaObjetivoSnapshot === null ||
    params.diaObjetivoSnapshot < 1 ||
    params.consumoPorAveGEsperado === null ||
    params.consumoTotalKgEsperado === null ||
    renglones.length === 0
  ) {
    return false;
  }

  const ordenados = [...renglones].sort((a, b) => a.orden - b.orden);

  for (let i = 0; i < ordenados.length; i++) {
    const r = ordenados[i];

    if (r.orden !== i + 1) return false;
    if (!Number.isInteger(r.diaInicio) || r.diaInicio < 1) return false;
    if (!Number.isInteger(r.diaFin) || r.diaFin < r.diaInicio) return false;
    if (r.consumoPorAveG.isNegative() || r.consumoTotalKg.isNegative()) {
      return false;
    }

    const esSintetico =
      r.tipoAlimentoId === null &&
      r.tipoAlimentoNombreSnapshot === null &&
      r.etapaSnapshot === null;
    const esReal =
      r.tipoAlimentoId !== null &&
      typeof r.tipoAlimentoNombreSnapshot === 'string' &&
      r.tipoAlimentoNombreSnapshot.trim().length > 0 &&
      r.etapaSnapshot !== null &&
      (ETAPAS_ALIMENTACION as readonly string[]).includes(r.etapaSnapshot);

    if (esSintetico) {
      if (r.extendidoHastaDiaObjetivo) return false;
    } else if (!esReal) {
      return false;
    }
  }

  if (ordenados[0].diaInicio !== 1) return false;
  if (ordenados[ordenados.length - 1].diaFin !== params.diaObjetivoSnapshot) {
    return false;
  }
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].diaInicio !== ordenados[i - 1].diaFin + 1) return false;
  }

  const sinteticos = ordenados.filter((r) => r.tipoAlimentoId === null);
  if (params.estadoDesglose === 'calculado' && sinteticos.length > 0) {
    return false;
  }
  if (
    params.estadoDesglose === 'catalogo_incompleto' &&
    sinteticos.length === 0
  ) {
    return false;
  }

  const extendidos = ordenados.filter((r) => r.extendidoHastaDiaObjetivo);
  if (extendidos.length > 1) return false;
  if (extendidos.length === 1 && extendidos[0].orden !== ordenados.length) {
    return false;
  }

  const sumaPorAve = ordenados.reduce(
    (acumulado, r) => acumulado.plus(r.consumoPorAveG),
    new Prisma.Decimal(0),
  );
  if (!sumaPorAve.equals(params.consumoPorAveGEsperado)) return false;

  const sumaTotalKg = ordenados.reduce(
    (acumulado, r) => acumulado.plus(r.consumoTotalKg),
    new Prisma.Decimal(0),
  );
  if (!sumaTotalKg.equals(params.consumoTotalKgEsperado)) return false;

  return true;
}

export const VERSION_DESGLOSE_ACTUAL = 'desglose_etapas_rango_dias_v1';

/**
 * Fila del catalogo tal como la entrega el llamador. Precondicion: ya viene
 * filtrada a `activo = true` -- esta funcion no vuelve a filtrar por activo,
 * confia en que el servicio hizo esa consulta.
 */
export interface FilaCatalogoAlimento {
  id: number;
  nombre: string;
  marca: string | null;
  etapa: string | null;
  diaInicio: number | null;
  diaFin: number | null;
}

export interface ParametrosConstruccionDesglose {
  marcaAlimento: string | null;
  diaObjetivoSnapshot: number;
  consumoPorAveGEsperado: Prisma.Decimal;
  consumoTotalKgEsperado: Prisma.Decimal;
  catalogo: FilaCatalogoAlimento[];
  // Contrato: dominio 0..diaObjetivoSnapshot: acumuladoXxxEnDia(0) === 0
  // (ancla virtual, igual que consumo-curva.ts), sin redondear todavia, no
  // decrecientes. Se construyen en consumo-curva.ts al conectar el servicio.
  acumuladoPorAveEnDia: (dia: number) => Prisma.Decimal;
  acumuladoTotalKgEnDia: (dia: number) => Prisma.Decimal;
}

export interface ResultadoDesglose {
  estado: EstadoDesgloseAlimento;
  versionDesglose: string;
  marcaAlimentoSnapshot: string | null;
  renglones: RenglonDesglose[];
}

function esFilaCatalogoValida(fila: FilaCatalogoAlimento): boolean {
  return (
    fila.diaInicio !== null &&
    fila.diaInicio >= 1 &&
    (fila.diaFin === null || fila.diaFin >= fila.diaInicio) &&
    fila.nombre.trim().length > 0 &&
    fila.etapa !== null &&
    (ETAPAS_ALIMENTACION as readonly string[]).includes(fila.etapa)
  );
}

/**
 * Decide estado_desglose y construye los renglones, en el orden exacto de
 * prioridad: lote_sin_marca_alimento -> marca_sin_catalogo ->
 * catalogo_invalido -> catalogo_ambiguo -> catalogo_incompleto ->
 * calculado. legado_sin_desglose no sale nunca de aqui: solo lo pone el
 * backfill de la migracion sobre filas anteriores a Fase 2B.
 */
export function construirDesgloseAlimento(
  params: ParametrosConstruccionDesglose,
): ResultadoDesglose {
  function finalizar(
    estado: EstadoDesgloseAlimento,
    marcaAlimentoSnapshot: string | null,
    renglones: RenglonDesglose[],
  ): ResultadoDesglose {
    const valido = validarDesgloseAlimento(renglones, {
      estadoDesglose: estado,
      diaObjetivoSnapshot: params.diaObjetivoSnapshot,
      consumoPorAveGEsperado: params.consumoPorAveGEsperado,
      consumoTotalKgEsperado: params.consumoTotalKgEsperado,
    });
    if (!valido) {
      throw new Error(
        `construirDesgloseAlimento produjo un desglose invalido para estado_desglose = ${estado}`,
      );
    }
    return {
      estado,
      versionDesglose: VERSION_DESGLOSE_ACTUAL,
      marcaAlimentoSnapshot,
      renglones,
    };
  }

  if (params.marcaAlimento === null) {
    return finalizar('lote_sin_marca_alimento', null, []);
  }

  const marcaNormalizada = normalizarMarcaCatalogo(params.marcaAlimento);
  const filasMarca = params.catalogo.filter(
    (fila) =>
      fila.marca !== null &&
      normalizarMarcaCatalogo(fila.marca) === marcaNormalizada,
  );

  if (filasMarca.length === 0) {
    return finalizar('marca_sin_catalogo', marcaNormalizada, []);
  }

  if (filasMarca.some((fila) => !esFilaCatalogoValida(fila))) {
    return finalizar('catalogo_invalido', marcaNormalizada, []);
  }

  const validas = filasMarca
    .map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      etapa: fila.etapa as string,
      diaInicio: fila.diaInicio as number,
      diaFin: fila.diaFin,
    }))
    .sort((a, b) => a.diaInicio - b.diaInicio);

  for (let i = 0; i < validas.length - 1; i++) {
    if (validas[i].diaFin === null) {
      return finalizar('catalogo_ambiguo', marcaNormalizada, []);
    }
  }
  for (let i = 0; i < validas.length - 1; i++) {
    if (validas[i + 1].diaInicio <= (validas[i].diaFin as number)) {
      return finalizar('catalogo_ambiguo', marcaNormalizada, []);
    }
  }

  const ultima = validas[validas.length - 1];
  const tramosReales = validas
    .map((fila) => ({
      fila,
      diaInicio: fila.diaInicio,
      diaFin:
        fila === ultima && fila.diaFin === null
          ? params.diaObjetivoSnapshot
          : (fila.diaFin as number),
    }))
    .filter((tramo) => tramo.diaInicio <= params.diaObjetivoSnapshot)
    .map((tramo) => ({
      ...tramo,
      diaFin: Math.min(tramo.diaFin, params.diaObjetivoSnapshot),
    }));

  const tramos: Array<{
    diaInicio: number;
    diaFin: number;
    fuente: {
      id: number;
      nombre: string;
      etapa: string;
      extendido: boolean;
    } | null;
  }> = [];

  let cursor = 1;
  for (const tramo of tramosReales) {
    if (tramo.diaInicio > cursor) {
      tramos.push({
        diaInicio: cursor,
        diaFin: tramo.diaInicio - 1,
        fuente: null,
      });
    }
    tramos.push({
      diaInicio: tramo.diaInicio,
      diaFin: tramo.diaFin,
      fuente: {
        id: tramo.fila.id,
        nombre: tramo.fila.nombre,
        etapa: tramo.fila.etapa,
        extendido: tramo.fila.diaFin === null,
      },
    });
    cursor = tramo.diaFin + 1;
  }
  if (cursor <= params.diaObjetivoSnapshot) {
    tramos.push({
      diaInicio: cursor,
      diaFin: params.diaObjetivoSnapshot,
      fuente: null,
    });
  }

  const estado: EstadoDesgloseAlimento = tramos.some((t) => t.fuente === null)
    ? 'catalogo_incompleto'
    : 'calculado';

  const renglones: RenglonDesglose[] = tramos.map((tramo, indice) => {
    const consumoPorAveG = params
      .acumuladoPorAveEnDia(tramo.diaFin)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      .minus(
        params
          .acumuladoPorAveEnDia(tramo.diaInicio - 1)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      );
    const consumoTotalKg = params
      .acumuladoTotalKgEnDia(tramo.diaFin)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP)
      .minus(
        params
          .acumuladoTotalKgEnDia(tramo.diaInicio - 1)
          .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP),
      );

    return {
      orden: indice + 1,
      tipoAlimentoId: tramo.fuente?.id ?? null,
      tipoAlimentoNombreSnapshot: tramo.fuente?.nombre ?? null,
      etapaSnapshot: tramo.fuente?.etapa ?? null,
      diaInicio: tramo.diaInicio,
      diaFin: tramo.diaFin,
      extendidoHastaDiaObjetivo: tramo.fuente?.extendido ?? false,
      consumoPorAveG,
      consumoTotalKg,
    };
  });

  return finalizar(estado, marcaNormalizada, renglones);
}
