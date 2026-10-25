import type { CurvaCrecimiento, SeveridadAnomalia } from '@features/predicciones/api/predicciones'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { formatearPeso } from './proyeccion'

const DIAS_POR_SEMANA = 7
const PASO_SEMANAL = 7
const ORDEN_SEVERIDAD: SeveridadAnomalia[] = ['alta', 'media', 'baja']

export type LecturaDia = {
  dia: number
  esHoy: boolean
  real: number | null
  proyectado: number
  minimo: number
  maximo: number
  estandar: number | null
  desvioPct: number | null
}

export function marcasDeRegla(primerDia: number, diaFinal: number): number[] {
  const marcas = [primerDia]
  for (let dia = Math.ceil((primerDia + 1) / DIAS_POR_SEMANA) * DIAS_POR_SEMANA; dia < diaFinal; dia += DIAS_POR_SEMANA) {
    if (dia > primerDia) marcas.push(dia)
  }
  return marcas
}

export function posicionDeDia(dia: number, primerDia: number, diaFinal: number): number {
  if (diaFinal <= primerDia) return 0
  return Math.min(1, Math.max(0, (dia - primerDia) / (diaFinal - primerDia)))
}

export function diaDeFraccion(fraccion: number, primerDia: number, diaFinal: number): number {
  const limitada = Math.min(1, Math.max(0, fraccion))
  return Math.round(primerDia + limitada * (diaFinal - primerDia))
}

export function diaTrasTecla(tecla: string, dia: number, primerDia: number, diaFinal: number): number | null {
  const limitar = (valor: number) => Math.min(diaFinal, Math.max(primerDia, valor))
  switch (tecla) {
    case 'ArrowRight':
    case 'ArrowUp':
      return limitar(dia + 1)
    case 'ArrowLeft':
    case 'ArrowDown':
      return limitar(dia - 1)
    case 'PageUp':
      return limitar(dia + PASO_SEMANAL)
    case 'PageDown':
      return limitar(dia - PASO_SEMANAL)
    case 'Home':
      return primerDia
    case 'End':
      return diaFinal
    default:
      return null
  }
}

export function severidadPorDia(alertas: { dia: number; severidad: SeveridadAnomalia }[]): Map<number, SeveridadAnomalia> {
  const mapa = new Map<number, SeveridadAnomalia>()
  for (const alerta of alertas) {
    const actual = mapa.get(alerta.dia)
    if (!actual || ORDEN_SEVERIDAD.indexOf(alerta.severidad) < ORDEN_SEVERIDAD.indexOf(actual)) {
      mapa.set(alerta.dia, alerta.severidad)
    }
  }
  return mapa
}

export function lecturaDelDia(curva: CurvaCrecimiento | null, dia: number): LecturaDia | null {
  const punto = curva?.serie.find((item) => item.dia === dia)
  if (!curva || !punto) return null
  const desvioPct = punto.real_g !== null && punto.estandar_g
    ? ((punto.real_g - punto.estandar_g) / punto.estandar_g) * 100
    : null
  return {
    dia,
    esHoy: dia === curva.dia_actual,
    real: punto.real_g,
    proyectado: punto.proyectado_g,
    minimo: punto.min_g,
    maximo: punto.max_g,
    estandar: punto.estandar_g,
    desvioPct,
  }
}

export function fraseDeCrecimiento(curva: CurvaCrecimiento | null): string {
  if (!curva) return 'Registra al menos tres pesajes para ver cómo avanza el lote frente a la curva.'
  const pesajes = curva.modelo.puntos_usados
  if (pesajes < 3) {
    return `Hay ${pesajes} ${pesajes === 1 ? 'pesaje' : 'pesajes'}; registra ${3 - pesajes} más para mostrar la tendencia.`
  }
  const { desvio_vs_estandar_pct: desvio, dia_al_objetivo: llegada, peso_final_g: pesoFinal } = curva.resumen
  if (desvio === null) {
    return `Con los pesajes registrados, el lote llegaría a ${formatearPeso(pesoFinal)} el día ${curva.dia_final}.`
  }
  const magnitud = Math.abs(desvio).toLocaleString('es-CO', { maximumFractionDigits: 1 })
  const posicion = desvio < 0 ? 'por debajo' : 'por encima'
  const cierre = llegada !== null
    ? `llegaría a ${formatearPeso(curva.peso_objetivo_g)} el día ${Math.ceil(llegada)}`
    : `cerraría en ${formatearPeso(pesoFinal)} el día ${curva.dia_final}`
  return `Tu lote va ${magnitud} % ${posicion} de la curva; ${cierre}.`
}

export function textoDeLlegada(curva: CurvaCrecimiento): { valor: string; detalle: string; tenue: boolean; etiqueta: string } {
  const { peso_objetivo_g: objetivo, dia_final: diaFinal } = curva
  const { dia_al_objetivo: dia, fecha_al_objetivo: fecha } = curva.resumen
  if (objetivo === null) {
    return { etiqueta: 'Peso objetivo', valor: 'Sin definir', detalle: 'Fíjalo en la meta del lote para saber cuándo llega.', tenue: true }
  }
  if (dia === null) {
    return { etiqueta: `Llega a ${formatearPeso(objetivo)}`, valor: 'No lo alcanza', detalle: 'Con este ritmo, el lote no llega a ese peso.', tenue: true }
  }
  const diaRedondo = Math.ceil(dia)
  return {
    etiqueta: `Llega a ${formatearPeso(objetivo)}`,
    valor: `Día ${diaRedondo}`,
    detalle: `${formatearFechaCalendario(fecha)}${diaRedondo > diaFinal ? ` · después del día de salida (${diaFinal})` : ''}`,
    tenue: false,
  }
}
