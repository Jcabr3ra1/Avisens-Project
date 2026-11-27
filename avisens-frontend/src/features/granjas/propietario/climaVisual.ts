import type { LecturaClima } from '@features/clima/api/clima'

export type ClimaVisual = 'despejado' | 'nublado' | 'lluvia'

const HORAS_VIGENTE = 6
const UMBRAL_LLUVIA_MM = 0.2
const UMBRAL_HUMEDAD_NUBLADO = 88

export function climaVisual(lecturas: LecturaClima[], ahora: number = Date.now()): ClimaVisual {
  const reciente = lecturas.reduce<LecturaClima | null>(
    (ultima, lectura) => (ultima === null || lectura.fecha_hora > ultima.fecha_hora ? lectura : ultima),
    null,
  )
  if (!reciente) return 'despejado'
  const antiguedad = ahora - new Date(reciente.fecha_hora).getTime()
  if (!Number.isFinite(antiguedad) || antiguedad > HORAS_VIGENTE * 3600_000) return 'despejado'
  if ((reciente.precipitacion ?? 0) >= UMBRAL_LLUVIA_MM) return 'lluvia'
  if ((reciente.humedad ?? 0) >= UMBRAL_HUMEDAD_NUBLADO) return 'nublado'
  return 'despejado'
}
