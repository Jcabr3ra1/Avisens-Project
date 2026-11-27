import { MARGEN_EN_CURVA_PCT } from '@features/guia-crecimiento/model/proyeccion'

export type TonoJuicio = 'ok' | 'atencion' | 'critico' | 'sin_datos'

export type Juicio = { palabra: string; tono: TonoJuicio }

export const LIMITE_MORTALIDAD_NORMAL_PCT = 2
export const LIMITE_MORTALIDAD_ALTA_PCT = 5
export const MARGEN_ALIMENTO_KG = 0.05
export const LIMITE_PESO_MUY_BAJO_PCT = -10

export function juicioPeso(desvioPct: number | null | undefined): Juicio | null {
  if (desvioPct === null || desvioPct === undefined || !Number.isFinite(desvioPct)) return null
  if (desvioPct > MARGEN_EN_CURVA_PCT) return { palabra: 'Sobre la meta', tono: 'ok' }
  if (desvioPct >= -MARGEN_EN_CURVA_PCT) return { palabra: 'En rango', tono: 'ok' }
  if (desvioPct >= LIMITE_PESO_MUY_BAJO_PCT) return { palabra: 'Bajo', tono: 'atencion' }
  return { palabra: 'Muy bajo', tono: 'critico' }
}

export function juicioMortalidad(pct: number | null | undefined): Juicio | null {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null
  if (pct < LIMITE_MORTALIDAD_NORMAL_PCT) return { palabra: 'Normal', tono: 'ok' }
  if (pct < LIMITE_MORTALIDAD_ALTA_PCT) return { palabra: 'Elevada', tono: 'atencion' }
  return { palabra: 'Alta', tono: 'critico' }
}

export function juicioAlimento(desvioKg: number | null | undefined): Juicio | null {
  if (desvioKg === null || desvioKg === undefined || !Number.isFinite(desvioKg)) return null
  if (desvioKg <= MARGEN_ALIMENTO_KG) return { palabra: 'En rango', tono: 'ok' }
  return { palabra: 'Alta', tono: 'atencion' }
}

export function juicioTemperatura({ valor, min, max, severo = false }: {
  valor: number | null
  min: number | null
  max: number | null
  severo?: boolean
}): Juicio {
  if (valor === null || min === null || max === null) return { palabra: 'Sin rango', tono: 'sin_datos' }
  if (valor > max) return severo ? { palabra: 'Muy alta', tono: 'critico' } : { palabra: 'Alta', tono: 'atencion' }
  if (valor < min) return severo ? { palabra: 'Muy baja', tono: 'critico' } : { palabra: 'Baja', tono: 'atencion' }
  return { palabra: 'En rango', tono: 'ok' }
}
