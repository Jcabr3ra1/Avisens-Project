export { interpolarPesoEnDia } from './interpolarDiaObjetivo'
export { interpolarPuntoEnDia } from './interpolarDiaObjetivo'

export function calcularDesvioPct(pesoRealG: number | null, pesoEsperadoG: number | null): number | null {
  if (pesoRealG === null || pesoEsperadoG === null || pesoEsperadoG === 0) return null
  return ((pesoRealG - pesoEsperadoG) / pesoEsperadoG) * 100
}
