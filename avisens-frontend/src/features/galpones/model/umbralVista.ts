import type { Umbral } from '../api/umbrales'

// El ciclo del pollo de engorde dura unas seis semanas, y el umbral se busca
// por la semana de vida del lote. La semana 0 es la de cría —la más exigente,
// con la temperatura más alta— y va bajando hasta la salida.
export const SEMANAS_CICLO = [0, 1, 2, 3, 4, 5, 6] as const

export interface CeldaUmbral {
  semana: number
  umbral: Umbral | null
}

export interface FilaVariable {
  variable: string
  celdas: CeldaUmbral[]
  faltan: number
}

// Se agrupa por variable y se despliega en las siete semanas porque una rampa
// de cría solo se entiende viéndola entera: que la temperatura baje de 32 a 21
// es la información, y en filas sueltas no se ve.
//
// Los huecos importan más que los valores: una semana sin umbral deja al sensor
// en `sin_umbral`, la lectura no se compara, y el galpón sale verde aunque esté
// fuera de rango. Por eso la celda vacía se cuenta y se señala.
export function agruparPorVariable(
  umbrales: Umbral[],
  variables: readonly string[],
): FilaVariable[] {
  const vigentes = umbrales.filter((umbral) => umbral.vigente)

  return variables.map((variable) => {
    const deLaVariable = new Map(
      vigentes
        .filter((umbral) => umbral.variable === variable)
        .map((umbral) => [umbral.semana_vida, umbral]),
    )
    const celdas = SEMANAS_CICLO.map((semana) => ({
      semana,
      umbral: deLaVariable.get(semana) ?? null,
    }))
    return {
      variable,
      celdas,
      faltan: celdas.filter((celda) => celda.umbral === null).length,
    }
  })
}

export function rangoLegible(umbral: Umbral): string {
  return `${umbral.valor_minimo} – ${umbral.valor_maximo} ${umbral.unidad}`
}

// La semana de vida se cuenta desde 0, pero «semana 0» no le dice nada a nadie
// en una cabecera de tabla. Los días sí.
export function etiquetaSemana(semana: number): string {
  const inicio = semana * 7 + 1
  return `Días ${inicio}–${inicio + 6}`
}

export function hayHuecos(filas: FilaVariable[]): boolean {
  return filas.some((fila) => fila.faltan > 0)
}

export function totalDeHuecos(filas: FilaVariable[]): number {
  return filas.reduce((total, fila) => total + fila.faltan, 0)
}
