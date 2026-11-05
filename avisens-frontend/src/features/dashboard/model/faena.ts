import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { etiquetaConfianza } from '@features/guia-crecimiento/model/confianza'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { Fila } from './estadoLote'

export function filaDeFaena(curva: CurvaCrecimiento | null): Fila | null {
  if (!curva || curva.peso_objetivo_g === null) return null
  const objetivo = formatearPeso(curva.peso_objetivo_g)
  const confianza = etiquetaConfianza(curva.modelo.nivel_confianza)
  const cierre = `Al día ${curva.dia_final} pesaría ${formatearPeso(curva.resumen.peso_final_g)}`
  const nota = [cierre, confianza].filter(Boolean).join(' · ')
  const { dia_al_objetivo: dia, fecha_al_objetivo: fecha } = curva.resumen

  if (dia === null || dia > curva.dia_final) {
    return { etiqueta: `Llegar a ${objetivo}`, valor: 'No alcanza', nota, alerta: true }
  }
  return {
    etiqueta: `Llegar a ${objetivo}`,
    valor: formatearFechaCalendario(fecha),
    nota: `Día ${dia} del ciclo · ${nota}`,
  }
}
