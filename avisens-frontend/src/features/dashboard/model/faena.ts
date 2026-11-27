import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { etiquetaConfianza } from '@features/guia-crecimiento/model/confianza'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { diasDeVida, formatearFechaCalendario } from '@shared/utils/fechas'
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

export type VentaDelLote = {
  diaVenta: number
  diaActual: number
  faltan: number
  progreso: number
}

export function ventaDelLote(
  fechaIngreso: string,
  fechaSalidaEstimada: string | null | undefined,
  hoy: Date = new Date(),
): VentaDelLote | null {
  if (!fechaSalidaEstimada) return null
  const dia = fechaSalidaEstimada.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
  const salida = new Date(`${dia}T12:00:00`)
  if (Number.isNaN(salida.getTime())) return null
  const diaVenta = diasDeVida(fechaIngreso, salida)
  const diaActual = diasDeVida(fechaIngreso, hoy)
  return {
    diaVenta,
    diaActual,
    faltan: diaVenta - diaActual,
    progreso: diaVenta <= 0 ? 0 : Math.min(Math.max(diaActual / diaVenta, 0), 1),
  }
}

export function textoVenta(venta: VentaDelLote): string {
  if (venta.faltan > 1) return `Venta en ${venta.faltan} días`
  if (venta.faltan === 1) return 'Venta mañana'
  if (venta.faltan === 0) return 'Venta prevista para hoy'
  const pasados = Math.abs(venta.faltan)
  return pasados === 1
    ? 'Venta atrasada 1 día'
    : `Venta atrasada ${pasados} días`
}

export function textoNoAlcanza(curva: CurvaCrecimiento | null): string | null {
  if (!curva || curva.peso_objetivo_g === null) return null
  const { dia_al_objetivo: dia } = curva.resumen
  if (dia !== null && dia <= curva.dia_final) return null
  return `Con la curva actual no alcanza ${formatearPeso(curva.peso_objetivo_g)} antes del día ${curva.dia_final}.`
}
