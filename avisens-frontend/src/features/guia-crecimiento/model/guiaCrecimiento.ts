import type { IndicadorLote } from '../api/guiaCrecimiento'
import { formatearFechaCalendario } from '@shared/utils/fechas'

export { interpolarPesoEnDia } from './interpolarDiaObjetivo'
export { interpolarPuntoEnDia } from './interpolarDiaObjetivo'

export function calcularDesvioPct(pesoRealG: number | null, pesoEsperadoG: number | null): number | null {
  if (pesoRealG === null || pesoEsperadoG === null || pesoEsperadoG === 0) return null
  return ((pesoRealG - pesoEsperadoG) / pesoEsperadoG) * 100
}

export function obtenerPesoVerificado(indicador: IndicadorLote | null): { gramos: number; fecha: string } | null {
  if (!indicador || indicador.estado_calculo !== 'calculado' || !Number.isInteger(indicador.revision_calculo) || indicador.revision_calculo <= 0
    || indicador.estado_peso !== 'disponible' || !indicador.pesaje_fecha_snapshot
    || formatearFechaCalendario(indicador.pesaje_fecha_snapshot) === '—'
    || indicador.peso_promedio_g === null || !Number.isFinite(indicador.peso_promedio_g) || indicador.peso_promedio_g <= 0) return null
  return { gramos: indicador.peso_promedio_g, fecha: indicador.pesaje_fecha_snapshot }
}
