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
export const MARCAS_ALIMENTO = ['italcol', 'solla', 'contegral', 'finca'] as const;

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
] as const;

export type MarcaAlimento = (typeof MARCAS_ALIMENTO)[number];
export type SexoLote = (typeof SEXOS_LOTE)[number];
export type EtapaAlimentacion = (typeof ETAPAS_ALIMENTACION)[number];
