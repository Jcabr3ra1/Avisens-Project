/**
 * Las palabras que el sistema entiende para describir un lote y su alimento.
 *
 * Viven aquí y no en cada DTO porque se usan en sitios que tienen que estar de
 * acuerdo: el lote las guarda, la curva objetivo se busca por marca y sexo, y
 * el catálogo de alimentos se clasifica por etapa. Cuando cada uno llevaba su
 * propia lista, se separaban sin que nadie se enterara: una errata al crear el
 * lote lo dejaba sin curva con la que compararse durante todo el ciclo, y el
 * único síntoma era un «sin referencia» tres semanas después.
 */

/** Marcas de alimento con las que se trabaja. Sólo italcol y solla tienen curva sembrada. */
export const MARCAS_ALIMENTO = [
  'italcol',
  'solla',
  'contegral',
  'finca',
] as const;

/** El sexo del lote decide contra qué curva se compara: macho y hembra crecen distinto. */
export const SEXOS_LOTE = ['macho', 'hembra', 'mixto'] as const;

/**
 * Las etapas de alimentación, en orden de vida del pollo.
 *
 * Son las mismas que usan `curvas_objetivo.etapa_alimentacion` y
 * `tipos_alimento.etapa`: si se separan, deja de poderse cruzar el alimento
 * que se dio con la curva que le tocaba.
 */
export const ETAPAS_ALIMENTACION = [
  'preiniciacion',
  'iniciacion',
  'engorde',
  'finalizacion',
] as const;

export type MarcaAlimento = (typeof MARCAS_ALIMENTO)[number];
export type SexoLote = (typeof SEXOS_LOTE)[number];
export type EtapaAlimentacion = (typeof ETAPAS_ALIMENTACION)[number];
/** Identidad canonica de marca para cruzar Lote.marca_alimento (cerrado, MARCAS_ALIMENTO) contra TipoAlimento.marca (texto libre). */
export function normalizarMarcaCatalogo(valor: string): string {
  return valor.trim().toLowerCase();
}

export const PESO_MAXIMO_POLLO_G = 10000;

// Topes de consumo diario por ave. Un pollo de engorde en su pico come
// unos 0,25 kg y toma unos 0,5 L al día (más con calor); los topes dejan
// margen de sobra, solo detienen errores de digitación (un cero de más,
// litros en mililitros) que dañan el FCR y la guía de crecimiento.
export const ALIMENTO_MAXIMO_KG_POR_AVE_DIA = 0.4;
export const AGUA_MAXIMA_L_POR_AVE_DIA = 1.5;

// Topes absolutos de un registro de consumo, sin importar el tamaño del lote.
export const ALIMENTO_MAXIMO_KG_DIA = 100_000;
export const AGUA_MAXIMA_L_DIA = 300_000;

// Tope de un movimiento financiero en pesos. La columna admite hasta
// 999.999.999.999,99; diez mil millones ya supera cualquier operación
// real de una granja y deja el error de digitación con un mensaje claro
// en vez de un fallo de la base de datos.
export const VALOR_MAXIMO_MOVIMIENTO_COP = 10_000_000_000;
