import type { NivelCalor, RiesgoCalor } from '@features/predicciones/api/predicciones'
import { etiquetaHoraLarga } from '@features/predicciones/model/riesgoCalor'
import type { TonoJuicio } from './juicios'

export type CalorSencillo = {
  tono: TonoJuicio
  titulo: string
  detalle: string
  consejo: string | null
}

const TITULOS: Record<NivelCalor, string> = {
  confort: 'Sin riesgo de estrés por calor',
  atencion: 'Riesgo de calor moderado',
  alerta: 'Riesgo de calor alto',
  peligro: 'Riesgo de calor muy alto',
  emergencia: 'Calor extremo',
}

const TONOS: Record<NivelCalor, TonoJuicio> = {
  confort: 'ok',
  atencion: 'atencion',
  alerta: 'atencion',
  peligro: 'critico',
  emergencia: 'critico',
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function calorSencillo(riesgo: RiesgoCalor): CalorSencillo {
  const nivel = riesgo.nivel_maximo
  if (nivel === 'confort') {
    return {
      tono: 'ok',
      titulo: TITULOS.confort,
      detalle: 'Próximas 72 h dentro del rango de confort.',
      consejo: null,
    }
  }
  return {
    tono: TONOS[nivel],
    titulo: TITULOS[nivel],
    detalle: `Pico de ${entero.format(riesgo.pico.temperatura)} °C el ${etiquetaHoraLarga(riesgo.pico.hora)}.`,
    consejo: riesgo.recomendaciones[0] ?? null,
  }
}
