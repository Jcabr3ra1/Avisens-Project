// Límites físicos de un lote de pollo de engorde. Coinciden con los topes del
// backend (common/avicultura/vocabulario.ts). Sirven para no mostrar como
// reales los datos imposibles que ya quedaron guardados antes de que existieran
// esos topes (QA-01): un peso de 1e15 g o 1e40 kg de alimento en un día.

export const PESO_MAXIMO_POLLO_G = 10_000
export const ALIMENTO_MAXIMO_KG_POR_AVE_DIA = 0.4
export const AGUA_MAXIMA_L_POR_AVE_DIA = 1.5

const positivoFinito = (valor: number | null | undefined): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0

export function pesoCreible(g: number | null | undefined): boolean {
  return positivoFinito(g) && g <= PESO_MAXIMO_POLLO_G
}

// Un consumo vacío (null) no es un dato imposible: solo no se registró.
export function alimentoCreible(kg: number | null | undefined, aves: number): boolean {
  if (kg === null || kg === undefined) return true
  return positivoFinito(kg) && kg <= Math.max(aves, 1) * ALIMENTO_MAXIMO_KG_POR_AVE_DIA
}

export function aguaCreible(litros: number | null | undefined, aves: number): boolean {
  if (litros === null || litros === undefined) return true
  return positivoFinito(litros) && litros <= Math.max(aves, 1) * AGUA_MAXIMA_L_POR_AVE_DIA
}
