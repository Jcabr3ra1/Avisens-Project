import type { TonoGranja } from './estadoGranja'
import type { KpiGranja } from './resumenGranja'

export type FaseDelDia = 'amanecer' | 'dia' | 'tarde' | 'noche'

export type Astro = { tipo: 'sol' | 'luna'; x: number; y: number }

export type PosicionPollito = {
  x: number
  fila: number
  perspectiva: number
  retraso: number
  mirada: 1 | -1
}

const DIA_MAXIMO_CICLO = 42
const ESCALA_RECIEN_NACIDO = 0.5
const ESCALA_DE_FAENA = 1.15
const ESCALA_SIN_DATO = 0.8
const POLLITOS_MINIMOS = 3
const POLLITOS_MAXIMOS = 16
const AVES_POR_POLLITO_AL_CUADRADO = 1.6
const TEMPERATURA_MINIMA = 15
const TEMPERATURA_MAXIMA = 40

export function faseDelDia(hora: number): FaseDelDia {
  if (hora >= 5 && hora < 7) return 'amanecer'
  if (hora >= 7 && hora < 17) return 'dia'
  if (hora >= 17 && hora < 19) return 'tarde'
  return 'noche'
}

export function posicionDelAstro(hora: number): Astro {
  const esDeDia = hora >= 6 && hora < 18
  const progreso = esDeDia ? (hora - 6) / 12 : ((hora - 18 + 24) % 24) / 12
  return {
    tipo: esDeDia ? 'sol' : 'luna',
    x: 8 + progreso * 84,
    y: 34 - Math.sin(progreso * Math.PI) * 22,
  }
}

export function pollitosVisibles(aves: number): number {
  if (aves <= 0) return 0
  const proporcional = Math.round(Math.sqrt(aves) / AVES_POR_POLLITO_AL_CUADRADO)
  return Math.min(POLLITOS_MAXIMOS, Math.max(POLLITOS_MINIMOS, proporcional))
}

function avance(dia: number): number {
  return Math.min(1, Math.max(0, dia / DIA_MAXIMO_CICLO))
}

export function escalaDelPollito(dia: number | null): number {
  if (dia === null) return ESCALA_SIN_DATO
  return ESCALA_RECIEN_NACIDO + (ESCALA_DE_FAENA - ESCALA_RECIEN_NACIDO) * avance(dia)
}

export function colorDeEdad(dia: number | null): number {
  return dia === null ? 0.5 : avance(dia)
}

function generador(semilla: number): () => number {
  let estado = (Math.abs(Math.trunc(semilla)) * 2654435761 + 12345) % 4294967296
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

export function posicionesDePollitos(cantidad: number, semilla: number): PosicionPollito[] {
  const azar = generador(semilla)
  return Array.from({ length: cantidad }, (): PosicionPollito => {
    const fila = azar()
    return {
      x: 0.04 + azar() * 0.92,
      fila,
      perspectiva: 0.72 + fila * 0.28,
      retraso: azar() * 2.9,
      mirada: azar() < 0.5 ? -1 : 1,
    }
  }).sort((a, b) => a.fila - b.fila)
}

export function estadoDeLampara(tono: TonoGranja): { color: TonoGranja; pulsa: boolean } {
  return { color: tono, pulsa: tono !== 'ok' }
}

export function nivelDelTermometro(temperatura: number | null): number | null {
  if (temperatura === null) return null
  const nivel = (temperatura - TEMPERATURA_MINIMA) / (TEMPERATURA_MAXIMA - TEMPERATURA_MINIMA)
  return Math.min(1, Math.max(0, nivel))
}

export function etiquetaDeKpi(kpi: KpiGranja, diaLote: number | null): string {
  switch (kpi.id) {
    case 'aves': {
      const aves = kpi.valor === '1' ? '1 ave' : `${kpi.valor} aves`
      return diaLote === null ? aves : `${aves} · día ${diaLote}`
    }
    case 'alertas':
      if (kpi.valor === '0') return 'Sin alertas'
      return kpi.valor === '1' ? '1 alerta' : `${kpi.valor} alertas`
    case 'sensores':
      return `${kpi.valor} sensores`
    case 'galpones':
      return `${kpi.valor} galpones con lote`
  }
}
