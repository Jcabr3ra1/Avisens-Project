import { isAxiosError } from 'axios'
import { mensajeDeError } from '@shared/utils/errores'
import type { HoraRiesgoCalor, NivelCalor, RiesgoCalor } from '../api/predicciones'

export const NIVELES_CALOR: readonly NivelCalor[] = ['confort', 'atencion', 'alerta', 'peligro', 'emergencia']

const UMBRALES_THI: Record<Exclude<NivelCalor, 'confort'>, number> = {
  atencion: 30,
  alerta: 34,
  peligro: 37,
  emergencia: 38,
}
const AJUSTE_POLLITOS = 3
const DIA_POLLITO = 14

export const ETIQUETA_NIVEL: Record<NivelCalor, string> = {
  confort: 'Confort',
  atencion: 'Atención',
  alerta: 'Alerta',
  peligro: 'Peligro',
  emergencia: 'Emergencia',
}

export type FranjaCalor = { nivel: Exclude<NivelCalor, 'confort'>; desde: number; hasta: number | null }

export type ProblemaRiesgo =
  | { tipo: 'sin_ubicacion'; mensaje: string }
  | { tipo: 'error'; mensaje: string }

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

export function esPollito(diaVida: number | null | undefined): boolean {
  return diaVida != null && diaVida < DIA_POLLITO
}

export function franjasCalor(diaVida: number | null | undefined): FranjaCalor[] {
  const extra = esPollito(diaVida) ? AJUSTE_POLLITOS : 0
  const niveles = ['atencion', 'alerta', 'peligro', 'emergencia'] as const
  return niveles.map((nivel, i) => ({
    nivel,
    desde: UMBRALES_THI[nivel] + extra,
    hasta: i < niveles.length - 1 ? UMBRALES_THI[niveles[i + 1]] + extra : null,
  }))
}

function partesHora(hora: string) {
  const [fecha, reloj = '00:00'] = hora.split('T')
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [h, m] = reloj.split(':').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia, h, m))
}

const diaCorto = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' })
const diaLargo = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
const reloj = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: true, timeZone: 'UTC' })

function horaReloj(fecha: Date): string {
  return reloj.format(fecha).replace(/\s+/g, ' ').trim()
}

export function etiquetaHoraCorta(hora: string): string {
  const fecha = partesHora(hora)
  return `${diaCorto.format(fecha).replace('.', '')} ${horaReloj(fecha)}`
}

export function etiquetaHoraLarga(hora: string): string {
  const fecha = partesHora(hora)
  return `${diaLargo.format(fecha)} a las ${horaReloj(fecha)}`
}

export function esMedianoche(hora: string): boolean {
  return hora.endsWith('T00:00')
}

export function horasEnRiesgo(riesgo: RiesgoCalor): number {
  return NIVELES_CALOR.slice(1).reduce((total, nivel) => total + (riesgo.horas_por_nivel[nivel] ?? 0), 0)
}

export function titularRiesgo(riesgo: RiesgoCalor): string {
  if (riesgo.nivel_maximo === 'confort') return 'Sin riesgo de calor en las próximas 72 horas'
  const primera = riesgo.serie.find((hora) => hora.nivel !== 'confort')
  const cuando = primera ? `desde el ${etiquetaHoraLarga(primera.hora)}` : ''
  return `${ETIQUETA_NIVEL[riesgo.nivel_maximo]} por calor ${cuando}`.trim()
}

export function textoAjuste(riesgo: RiesgoCalor): string {
  const { temperatura } = riesgo.ajuste_aplicado
  if (riesgo.interior.temperatura === null) return 'Sin lectura de tus sensores: se usa el clima exterior'
  if (temperatura === 0) return 'Tu galpón está a la misma temperatura que afuera'
  const signo = temperatura > 0 ? '+' : '−'
  return `Tu galpón está ${signo}${decimal.format(Math.abs(temperatura))} °C frente al exterior`
}

export function resumenAccesibleRiesgo(riesgo: RiesgoCalor): string {
  return [
    `${titularRiesgo(riesgo)}.`,
    `Pico de índice THI ${decimal.format(riesgo.pico.thi)} el ${etiquetaHoraLarga(riesgo.pico.hora)},`,
    `con ${decimal.format(riesgo.pico.temperatura)} °C y ${decimal.format(riesgo.pico.humedad)} % de humedad.`,
    `${horasEnRiesgo(riesgo)} de ${riesgo.serie.length} horas con riesgo.`,
  ].join(' ')
}

export function horaPico(serie: HoraRiesgoCalor[]): HoraRiesgoCalor | null {
  return serie.reduce<HoraRiesgoCalor | null>((pico, hora) => (pico === null || hora.thi > pico.thi ? hora : pico), null)
}

export function interpretarErrorRiesgo(error: unknown): ProblemaRiesgo {
  const mensaje = mensajeDeError(error, 'No se pudo calcular el riesgo de calor.')
  if (isAxiosError(error) && error.response?.status === 422) {
    const codigo = (error.response.data as { codigo?: unknown } | undefined)?.codigo
    if (codigo === 'sin_ubicacion') return { tipo: 'sin_ubicacion', mensaje }
  }
  return { tipo: 'error', mensaje }
}

export type DiaPronostico = {
  fecha: string
  etiqueta: string
  horas: (HoraRiesgoCalor | null)[]
  pico: HoraRiesgoCalor
  temperaturaMaxima: number
  temperaturaMinima: number
}

const HORAS_MINIMAS_DIA = 6

export function diasDelPronostico(serie: HoraRiesgoCalor[]): DiaPronostico[] {
  const porFecha = new Map<string, HoraRiesgoCalor[]>()
  for (const hora of serie) {
    const fecha = hora.hora.slice(0, 10)
    porFecha.set(fecha, [...(porFecha.get(fecha) ?? []), hora])
  }
  return [...porFecha.entries()].filter(([, horas]) => horas.length >= HORAS_MINIMAS_DIA).map(([fecha, horas]) => {
    const casillas: (HoraRiesgoCalor | null)[] = Array.from({ length: 24 }, () => null)
    for (const hora of horas) casillas[Number(hora.hora.slice(11, 13))] = hora
    const temperaturas = horas.map((hora) => hora.temperatura)
    return {
      fecha,
      etiqueta: diaLargo.format(partesHora(`${fecha}T12:00`)),
      horas: casillas,
      pico: horaPico(horas) ?? horas[0],
      temperaturaMaxima: Math.max(...temperaturas),
      temperaturaMinima: Math.min(...temperaturas),
    }
  })
}

export type EscalaThi = { minimo: number; maximo: number }

export function escalaThi(franjas: FranjaCalor[]): EscalaThi {
  const inicio = franjas[0]?.desde ?? 30
  const final = franjas[franjas.length - 1]?.desde ?? 38
  return { minimo: inicio - 20, maximo: final + 4 }
}

export function posicionEnEscala(valor: number, escala: EscalaThi): number {
  const relativa = ((valor - escala.minimo) / (escala.maximo - escala.minimo)) * 100
  return Math.min(100, Math.max(0, relativa))
}

export function intensidadConfort(thi: number, franjas: FranjaCalor[]): number {
  const inicio = franjas[0]?.desde ?? 30
  return Math.min(1, Math.max(0, (thi - (inicio - 16)) / 16))
}
