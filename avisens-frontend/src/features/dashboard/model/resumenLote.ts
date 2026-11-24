import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
import { avesActuales } from '@features/granjas/model/estructura'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import type { DashboardIndicador, DashboardLote } from './dashboard'
import {
  comparacionVigente,
  esDatoVerificado,
  fcrCreible,
  mismaRevision,
  pesoCreible,
  textoFechaPesaje,
} from './estadoLote'
import { ventaDelLote, type VentaDelLote } from './faena'
import { juicioAlimento, juicioMortalidad, juicioPeso, type Juicio } from './juicios'

export type MedidaLote = {
  clave: 'peso' | 'mortalidad' | 'conversion'
  titulo: string
  cifra: string
  comparacion: string | null
  juicio: Juicio | null
  ayuda: string | null
}

export type ResumenLote = {
  pollos: { vivos: number; ingresados: number; muertos: number }
  hayDatos: boolean
  medidas: MedidaLote[]
  venta: VentaDelLote | null
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const dosDecimales = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function aves(cantidad: number): string {
  return `${enteros.format(cantidad)} ${cantidad === 1 ? 'ave' : 'aves'}`
}

function medidaPeso(
  reciente: DashboardIndicador,
  comparacion: ComparacionIndicador | null,
  vigente: boolean,
): MedidaLote | null {
  const peso = reciente.pesoPromedioG
  if (peso === null || !pesoCreible(peso)) return null
  const meta = vigente ? comparacion?.objetivo?.peso_esperado_g ?? null : null
  return {
    clave: 'peso',
    titulo: 'Peso promedio',
    cifra: formatearPeso(peso),
    comparacion: meta !== null ? `meta ${formatearPeso(meta)}` : null,
    juicio: vigente ? juicioPeso(comparacion?.desvio_peso_pct) : null,
    ayuda: null,
  }
}

function medidaMortalidad(reciente: DashboardIndicador, muertos: number): MedidaLote | null {
  const pct = reciente.mortalidadAcumuladaPct
  if (pct === null) return null
  return {
    clave: 'mortalidad',
    titulo: 'Mortalidad',
    cifra: `${unDecimal.format(pct)} %`,
    comparacion: aves(muertos),
    juicio: juicioMortalidad(pct),
    ayuda: null,
  }
}

function medidaConversion(
  reciente: DashboardIndicador,
  comparacion: ComparacionIndicador | null,
  vigente: boolean,
): MedidaLote | null {
  const fcr = reciente.fcr
  if (fcr === null || !fcrCreible(fcr)) return null
  const meta = vigente ? comparacion?.objetivo?.fcr_objetivo ?? null : null
  const corte = textoFechaPesaje(reciente.pesajeFechaSnapshot)
  return {
    clave: 'conversion',
    titulo: 'Conversión alimenticia',
    cifra: dosDecimales.format(fcr),
    comparacion: meta !== null ? `meta ${dosDecimales.format(meta)}` : null,
    juicio: vigente ? juicioAlimento(comparacion?.desvio_fcr) : null,
    ayuda: corte ? `kg de alimento por kg ganado, ${corte}` : 'kg de alimento por kg ganado',
  }
}

export function resumenLote({ lote, indicadores, comparacion, hoy = new Date() }: {
  lote: DashboardLote
  indicadores: DashboardIndicador[]
  comparacion: ComparacionIndicador | null
  hoy?: Date
}): ResumenLote {
  const reciente = indicadores[0] ?? null
  const verificado = reciente !== null && esDatoVerificado(reciente.estadoCalculo)
  const vigente = reciente !== null
    && verificado
    && comparacionVigente(comparacion?.fecha_del_dato_usado, reciente.fecha)
    && mismaRevision(comparacion?.revision_calculo, reciente.revisionCalculo)

  const mortalidad = reciente !== null && verificado ? reciente.mortalidadAcumuladaPct : null
  const vivos = avesActuales(lote.cantidadInicial, mortalidad)
  const muertos = lote.cantidadInicial - vivos

  const medidas = reciente !== null && verificado
    ? [
        medidaPeso(reciente, comparacion, vigente),
        medidaMortalidad(reciente, muertos),
        medidaConversion(reciente, comparacion, vigente),
      ].filter((medida): medida is MedidaLote => medida !== null)
    : []

  return {
    pollos: { vivos, ingresados: lote.cantidadInicial, muertos },
    hayDatos: medidas.length > 0,
    medidas,
    venta: ventaDelLote(lote.fechaIngreso, lote.fechaSalidaEstimada, hoy),
  }
}
