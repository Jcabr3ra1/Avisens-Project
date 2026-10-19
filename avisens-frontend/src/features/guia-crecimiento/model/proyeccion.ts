import { isAxiosError } from 'axios'
import { mensajeDeError } from '@shared/utils/errores'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'

export const MARGEN_EN_CURVA_PCT = 3

export type TonoDesvio = 'bajo' | 'en-curva' | 'alto'

export type ProblemaCurva =
  | { tipo: 'sin_pesajes' }
  | { tipo: 'error'; mensaje: string }

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function gramos(valor: number | null | undefined): string {
  return valor === null || valor === undefined || !Number.isFinite(valor)
    ? '—'
    : `${numero.format(valor)} g`
}

export function porcentaje(fraccion: number): string {
  return `${numero.format(Math.round(fraccion * 100))} %`
}

export function tonoDesvio(pct: number): TonoDesvio {
  if (pct < -MARGEN_EN_CURVA_PCT) return 'bajo'
  if (pct > MARGEN_EN_CURVA_PCT) return 'alto'
  return 'en-curva'
}

export function textoDesvio(pct: number, referencia: string): string {
  const magnitud = `${decimal.format(Math.abs(pct))} %`
  const tono = tonoDesvio(pct)
  if (tono === 'bajo') return `${magnitud} por debajo de ${referencia}`
  if (tono === 'alto') return `${magnitud} por encima de ${referencia}`
  return `En la curva de ${referencia} (${pct >= 0 ? '+' : '−'}${magnitud})`
}

export function estandarDelDia(curva: CurvaCrecimiento, dia: number): number | null {
  return curva.serie.find((punto) => punto.dia === dia)?.estandar_g ?? null
}

export function interpretarErrorCurva(error: unknown): ProblemaCurva {
  const mensaje = mensajeDeError(error, '')
  if (isAxiosError(error) && error.response?.status === 422 && /al menos un pesaje/i.test(mensaje)) {
    return { tipo: 'sin_pesajes' }
  }
  return {
    tipo: 'error',
    mensaje: mensajeDeError(error, 'No se pudo calcular la curva de crecimiento.'),
  }
}

export function resumenAccesible(curva: CurvaCrecimiento, referencia: string | null): string {
  const partes = [
    `Curva de crecimiento del lote ${curva.codigo}.`,
    `Último pesaje: ${gramos(curva.resumen.ultimo_pesaje.peso_g)} el día ${curva.resumen.ultimo_pesaje.dia}.`,
    `Proyección al día ${curva.dia_final}: ${gramos(curva.resumen.peso_final_g)}.`,
  ]
  if (referencia && curva.resumen.desvio_vs_estandar_pct !== null) {
    partes.push(`${textoDesvio(curva.resumen.desvio_vs_estandar_pct, referencia)}.`)
  }
  return partes.join(' ')
}

export function explicarSinProyeccion(mensaje: string): string {
  if (/plan/i.test(mensaje)) {
    return 'Fija el peso objetivo en «Objetivo del lote» y aquí verás cómo cierra el ciclo: mortalidad, alimento y conversión proyectados.'
  }
  if (/3 d[ií]as/i.test(mensaje)) {
    return 'Se necesitan pesajes de al menos 3 días distintos para proyectar el cierre del ciclo.'
  }
  if (/super[oó]/i.test(mensaje)) {
    return 'El lote ya pasó su día de faena: no queda nada por proyectar.'
  }
  return mensaje
}
