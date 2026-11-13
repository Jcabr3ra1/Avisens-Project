import { diasDeVida } from '@shared/utils/fechas'
import type { PlanAlimentoGuia, PuntoCurvaGenetica } from '../api/guiaCrecimiento'

export type EtapaCrianza = 'preinicio' | 'inicio' | 'engorde' | 'finalizacion'

export type RegistroMortalidadSimple = {
  dia?: number
  fecha?: string
  cantidad_aves?: number
  muertes?: number
}

export type FaseCicloVisual = {
  orden: number
  etapa: EtapaCrianza
  nombreEtapa: string
  alimento: string
  diaInicio: number
  diaFin: number
  avesVivas?: number | null
  consumoPorAveG?: number | null
  consumoTotalKg?: number | null
  bultos40kg?: number | null
}

export type InfoEtapaDia = {
  etapa: EtapaCrianza
  nombreEtapa: string
  alimento: string
  diaInicio: number
  diaFin: number
  diasParaCambio: number
  proximaEtapa: string | null
  proximoAlimento: string | null
}

export const COLORES_ETAPAS: Record<EtapaCrianza, string> = {
  preinicio: '#10b981',
  inicio: '#3b82f6',
  engorde: '#f59e0b',
  finalizacion: '#8b5cf6',
}

const NOMBRES_ETAPAS: Record<EtapaCrianza, string> = {
  preinicio: 'Preinicio',
  inicio: 'Inicio',
  engorde: 'Engorde',
  finalizacion: 'Finalización',
}

function normalizarEtapa(etapa: string | null | undefined): EtapaCrianza {
  const normalizada = (etapa ?? '').toLowerCase().trim()
  if (normalizada.includes('preini') || normalizada.includes('pre-ini')) return 'preinicio'
  if (normalizada.includes('ini')) return 'inicio'
  if (normalizada.includes('engorde')) return 'engorde'
  if (normalizada.includes('fin')) return 'finalizacion'
  return 'engorde'
}

/**
 * Extrae el día de vida en el que ocurrió un evento de mortalidad.
 */
function obtenerDiaDeMortalidad(
  registro: RegistroMortalidadSimple,
  fechaIngreso?: string,
): number | null {
  if (typeof registro.dia === 'number' && registro.dia > 0) return registro.dia
  if (registro.fecha && fechaIngreso) {
    const fechaReg = new Date(registro.fecha)
    if (!Number.isNaN(fechaReg.getTime())) {
      return diasDeVida(fechaIngreso, fechaReg)
    }
  }
  return null
}

/**
 * Construye una función que entrega la cantidad de aves vivas en cualquier día de vida del lote,
 * teniendo en cuenta las bajas registradas en la bitácora o en el corte del plan de alimento.
 */
export function construirCalculadorAvesVivas(
  cantidadInicial: number,
  mortalidad?: RegistroMortalidadSimple[] | null,
  fechaIngreso?: string,
  corteAlimento?: {
    dia?: number
    muertes?: number | null
    aves_vivas?: number | null
    mortalidad_por_dia?: Array<{ dia: number; muertes: number }>
  } | null,
): {
  avesVivasEnDia: (dia: number) => number
  totalBajas: number
  avesVivasActual: number
} {
  const inicial = Math.max(0, cantidadInicial)
  const muertesPorDia = new Map<number, number>()
  let totalBajas = 0

  if (mortalidad && mortalidad.length > 0) {
    for (const reg of mortalidad) {
      const cantidad = reg.cantidad_aves ?? reg.muertes ?? 0
      if (cantidad <= 0) continue
      totalBajas += cantidad
      const dia = obtenerDiaDeMortalidad(reg, fechaIngreso)
      if (dia !== null) {
        muertesPorDia.set(dia, (muertesPorDia.get(dia) ?? 0) + cantidad)
      }
    }
  } else if (
    corteAlimento?.mortalidad_por_dia &&
    corteAlimento.mortalidad_por_dia.length > 0
  ) {
    for (const reg of corteAlimento.mortalidad_por_dia) {
      const cantidad = reg.muertes ?? 0
      if (cantidad <= 0) continue
      totalBajas += cantidad
      muertesPorDia.set(reg.dia, (muertesPorDia.get(reg.dia) ?? 0) + cantidad)
    }
  } else if (typeof corteAlimento?.muertes === 'number' && corteAlimento.muertes > 0) {
    totalBajas = corteAlimento.muertes
    const diaCorte = corteAlimento.dia ?? 1
    muertesPorDia.set(diaCorte, totalBajas)
  }

  const avesVivasEnDia = (dia: number): number => {
    let bajasHastaDia = 0
    if (muertesPorDia.size > 0) {
      for (const [d, cant] of muertesPorDia.entries()) {
        if (d <= dia) bajasHastaDia += cant
      }
    } else if (totalBajas > 0) {
      bajasHastaDia = totalBajas
    }
    return Math.max(0, inicial - bajasHastaDia)
  }

  const avesVivasActual = Math.max(0, inicial - totalBajas)

  return {
    avesVivasEnDia,
    totalBajas,
    avesVivasActual,
  }
}

/**
 * Calcula el consumo por ave y para todo el lote vivo en un tramo de días,
 * descontando las bajas registradas en la bitácora día a día.
 */
function calcularConsumoTramoConAvesVivas(
  diaInicio: number,
  diaFin: number,
  avesVivasEnDia: (dia: number) => number,
  puntosCurva?: PuntoCurvaGenetica[],
): { consumoPorAveG: number; consumoTotalKg: number; bultos40kg: number } {
  let gPorAve = 0
  let kgTotal = 0

  const mapaPuntos = new Map<number, PuntoCurvaGenetica>()
  if (puntosCurva) {
    for (const p of puntosCurva) {
      mapaPuntos.set(p.dia, p)
    }
  }

  for (let d = diaInicio; d <= diaFin; d++) {
    let gDia = 0
    const pActual = mapaPuntos.get(d)
    const pPrevio = mapaPuntos.get(d - 1)

    if (pActual?.consumo_diario_g != null && pActual.consumo_diario_g > 0) {
      gDia = pActual.consumo_diario_g
    } else if (
      pActual?.consumo_acumulado_g != null &&
      pPrevio?.consumo_acumulado_g != null
    ) {
      gDia = Math.max(0, pActual.consumo_acumulado_g - pPrevio.consumo_acumulado_g)
    } else if (pActual?.consumo_acumulado_g != null && d === 1) {
      gDia = pActual.consumo_acumulado_g
    } else {
      // Fallback empírico Ross 308 estándar
      if (d <= 8) gDia = 26.25
      else if (d <= 21) gDia = 75.38
      else if (d <= 34) gDia = 161.54
      else gDia = 185
    }

    gPorAve += gDia
    const avesDia = avesVivasEnDia(d)
    kgTotal += (gDia * avesDia) / 1000
  }

  const consumoTotalKg = Math.max(1, Math.round(kgTotal))
  const bultos40kg = Math.max(1, Math.ceil(consumoTotalKg / 40))

  return {
    consumoPorAveG: Math.round(gPorAve),
    consumoTotalKg,
    bultos40kg,
  }
}

/**
 * Obtiene las fases de alimentación para un ciclo.
 * - Enfocado a nivel de todo el lote: calcula kilogramos y bultos basados en las aves vivas.
 * - Integra las bajas de la bitácora para alimentar solo a los pollos activos.
 * - Topa estrictamente cada etapa al día de faena (diaFinal), sin arrastrar días sobrantes.
 */
export function obtenerFasesCiclo(
  diaFinal: number,
  alimento?: PlanAlimentoGuia | null,
  puntosCurva?: PuntoCurvaGenetica[],
  cantidadAves?: number,
  mortalidad?: RegistroMortalidadSimple[] | null,
  fechaIngreso?: string,
): FaseCicloVisual[] {
  const diaFinCiclo = Math.max(1, diaFinal)
  const cantInicial =
    cantidadAves ??
    alimento?.corte?.cantidad_inicial ??
    1000

  const { avesVivasEnDia, totalBajas } = construirCalculadorAvesVivas(
    cantInicial,
    mortalidad,
    fechaIngreso,
    alimento?.corte,
  )

  // 1. Si el backend calculó fases con consumo, las filtramos y topamos a diaFinCiclo
  const fasesBackend = alimento?.desglose?.fases
  if (
    fasesBackend &&
    fasesBackend.length > 0 &&
    fasesBackend.some((f) => (f.consumo_total_kg ?? 0) > 0)
  ) {
    const filtradas = fasesBackend.filter((f) => f.dia_inicio <= diaFinCiclo)
    if (filtradas.length > 0) {
      return filtradas.map((fase) => {
        const etapa = normalizarEtapa(fase.etapa)
        const diaFinFase = Math.min(fase.dia_fin, diaFinCiclo)
        const avesVivasFase = avesVivasEnDia(diaFinFase)

        const requiereRecalculo =
          diaFinFase < fase.dia_fin || totalBajas > 0 || !fase.consumo_total_kg

        let consumoPorAveG = fase.consumo_por_ave_g
        let consumoTotalKg = fase.consumo_total_kg
        let bultos40kg = fase.bultos_40kg

        if (requiereRecalculo) {
          const calculo = calcularConsumoTramoConAvesVivas(
            fase.dia_inicio,
            diaFinFase,
            avesVivasEnDia,
            puntosCurva,
          )
          consumoPorAveG = calculo.consumoPorAveG
          consumoTotalKg = calculo.consumoTotalKg
          bultos40kg = calculo.bultos40kg
        }

        return {
          orden: fase.orden,
          etapa,
          nombreEtapa: NOMBRES_ETAPAS[etapa] ?? fase.nombre_etapa,
          alimento: fase.alimento,
          diaInicio: fase.dia_inicio,
          diaFin: diaFinFase,
          avesVivas: avesVivasFase,
          consumoPorAveG,
          consumoTotalKg,
          bultos40kg,
        }
      })
    }
  }

  // 2. Si el backend calculó renglones con consumo, los filtramos y topamos a diaFinCiclo
  const renglones = alimento?.desglose?.renglones
  if (renglones && renglones.length > 0 && renglones.some((r) => r.consumo_total_kg > 0)) {
    const filtrados = renglones.filter((r) => r.dia_inicio <= diaFinCiclo)
    if (filtrados.length > 0) {
      return filtrados.map((r) => {
        const etapa = normalizarEtapa(r.etapa)
        const diaFinRenglon = Math.min(r.dia_fin, diaFinCiclo)
        const avesVivasFase = avesVivasEnDia(diaFinRenglon)

        const requiereRecalculo =
          diaFinRenglon < r.dia_fin || totalBajas > 0 || !r.consumo_total_kg

        let consumoPorAveG = Math.round(r.consumo_por_ave_g)
        let consumoTotalKg = Math.round(r.consumo_total_kg)
        let bultos40kg = Math.ceil(r.consumo_total_kg / 40)

        if (requiereRecalculo) {
          const calculo = calcularConsumoTramoConAvesVivas(
            r.dia_inicio,
            diaFinRenglon,
            avesVivasEnDia,
            puntosCurva,
          )
          consumoPorAveG = calculo.consumoPorAveG
          consumoTotalKg = calculo.consumoTotalKg
          bultos40kg = calculo.bultos40kg
        }

        return {
          orden: r.orden,
          etapa,
          nombreEtapa: NOMBRES_ETAPAS[etapa],
          alimento: r.tipo_alimento_nombre_snapshot || `Alimento ${NOMBRES_ETAPAS[etapa]}`,
          diaInicio: r.dia_inicio,
          diaFin: diaFinRenglon,
          avesVivas: avesVivasFase,
          consumoPorAveG,
          consumoTotalKg,
          bultos40kg,
        }
      })
    }
  }

  // 3. Fallback adaptativo: etapas proporcionales calculadas para las aves vivas
  const tramosBase =
    diaFinCiclo <= 34
      ? [
          {
            orden: 1,
            etapa: 'preinicio' as const,
            nombreEtapa: 'Preinicio',
            alimento: 'Alimento Preinicio',
            diaInicio: 1,
            diaFin: Math.min(8, diaFinCiclo),
          },
          ...(diaFinCiclo >= 9
            ? [
                {
                  orden: 2,
                  etapa: 'inicio' as const,
                  nombreEtapa: 'Inicio',
                  alimento: 'Alimento Inicio',
                  diaInicio: 9,
                  diaFin: Math.min(21, diaFinCiclo),
                },
              ]
            : []),
          ...(diaFinCiclo >= 22
            ? [
                {
                  orden: 3,
                  etapa: 'engorde' as const,
                  nombreEtapa: 'Engorde',
                  alimento: 'Alimento Engorde',
                  diaInicio: 22,
                  diaFin: diaFinCiclo,
                },
              ]
            : []),
        ]
      : [
          {
            orden: 1,
            etapa: 'preinicio' as const,
            nombreEtapa: 'Preinicio',
            alimento: 'Alimento Preinicio',
            diaInicio: 1,
            diaFin: 8,
          },
          {
            orden: 2,
            etapa: 'inicio' as const,
            nombreEtapa: 'Inicio',
            alimento: 'Alimento Inicio',
            diaInicio: 9,
            diaFin: 21,
          },
          {
            orden: 3,
            etapa: 'engorde' as const,
            nombreEtapa: 'Engorde',
            alimento: 'Alimento Engorde',
            diaInicio: 22,
            diaFin: 34,
          },
          {
            orden: 4,
            etapa: 'finalizacion' as const,
            nombreEtapa: 'Finalización',
            alimento: 'Alimento Finalizador',
            diaInicio: 35,
            diaFin: diaFinCiclo,
          },
        ]

  return tramosBase.map((tramo) => {
    const avesVivasFase = avesVivasEnDia(tramo.diaFin)
    const { consumoPorAveG, consumoTotalKg, bultos40kg } =
      calcularConsumoTramoConAvesVivas(
        tramo.diaInicio,
        tramo.diaFin,
        avesVivasEnDia,
        puntosCurva,
      )

    return {
      ...tramo,
      avesVivas: avesVivasFase,
      consumoPorAveG,
      consumoTotalKg,
      bultos40kg,
    }
  })
}

/**
 * Determina la información de etapa y alimento para cualquier día del ciclo.
 */
export function obtenerEtapaDelDia(
  dia: number,
  fases: FaseCicloVisual[],
): InfoEtapaDia | null {
  if (fases.length === 0) return null

  // Busca la fase que contiene el día; si está antes usa la primera, si está después la última
  let indice = fases.findIndex((f) => dia >= f.diaInicio && dia <= f.diaFin)
  if (indice === -1) {
    indice = dia < fases[0].diaInicio ? 0 : fases.length - 1
  }

  const faseActual = fases[indice]
  const siguienteFase = fases[indice + 1] ?? null
  const diasParaCambio = siguienteFase ? Math.max(0, faseActual.diaFin - dia + 1) : 0

  return {
    etapa: faseActual.etapa,
    nombreEtapa: faseActual.nombreEtapa,
    alimento: faseActual.alimento,
    diaInicio: faseActual.diaInicio,
    diaFin: faseActual.diaFin,
    diasParaCambio,
    proximaEtapa: siguienteFase?.nombreEtapa ?? null,
    proximoAlimento: siguienteFase?.alimento ?? null,
  }
}

/**
 * Construye un gradiente CSS lineal horizontal para la pista del ciclo,
 * creando una difusión gradual y fluida de color entre una etapa y otra
 * en lugar de un corte limpio.
 */
export function construirGradienteEtapas(
  fases: FaseCicloVisual[],
  primerDia: number,
  diaFinal: number,
  diasDifusion = 2,
): string {
  if (fases.length === 0) {
    return 'var(--primary)'
  }
  if (fases.length === 1) {
    return COLORES_ETAPAS[fases[0].etapa] ?? 'var(--primary)'
  }

  const rangoDias = Math.max(1, diaFinal - primerDia)
  const pct = (dia: number) => {
    const p = ((dia - primerDia) / rangoDias) * 100
    return Math.max(0, Math.min(100, p)).toFixed(2)
  }

  const paradas: string[] = []
  const mitadDifusion = diasDifusion / 2

  fases.forEach((fase, i) => {
    const color = COLORES_ETAPAS[fase.etapa] ?? 'var(--primary)'
    const esPrimera = i === 0
    const esUltima = i === fases.length - 1

    // Inicio del color sólido para esta etapa
    if (esPrimera) {
      paradas.push(`${color} 0%`)
    } else {
      const diaEntrada = fase.diaInicio + mitadDifusion
      paradas.push(`${color} ${pct(diaEntrada)}%`)
    }

    // Fin del color sólido antes de empezar a difuminar hacia la siguiente etapa
    if (esUltima) {
      paradas.push(`${color} 100%`)
    } else {
      const diaSalida = fase.diaFin - mitadDifusion
      paradas.push(`${color} ${pct(diaSalida)}%`)
    }
  })

  return `linear-gradient(90deg, ${paradas.join(', ')})`
}
