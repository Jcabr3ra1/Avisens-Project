import type { IndicadorLote, PuntoCurvaGenetica } from '../api/guiaCrecimiento'
import type { Medicion } from '@features/sensores/api/mediciones'
import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import type { Mortalidad } from '@features/bitacora/model/bitacora'
import { diasDeVida } from '@shared/utils/fechas'

export type PuntoDia = { dia: number; real: number | null; esperado: number | null }
export type PuntoAmbiente = { fecha: string; temperatura: number | null; humedad: number | null }

function diaDeRegistro(fechaIngreso: string, fecha: string): number {
  const dia = fecha.slice(0, 10)
  return diasDeVida(fechaIngreso.slice(0, 10), new Date(`${dia}T12:00:00`))
}

function muertesPorDia(
  registros: Mortalidad[],
  fechaIngreso: string,
  diaActual: number,
): Map<number, number> | null {
  const resultado = new Map<number, number>()
  for (const registro of registros) {
    if (registro.fecha.slice(0, 10) < fechaIngreso.slice(0, 10)) return null
    const dia = diaDeRegistro(fechaIngreso, registro.fecha)
    if (!Number.isInteger(registro.cantidad_aves) || registro.cantidad_aves <= 0 || dia <= 0 || dia > diaActual) return null
    resultado.set(dia, (resultado.get(dia) ?? 0) + registro.cantidad_aves)
  }
  return resultado
}

export function serieConsumo(
  consumos: ConsumoDiario[],
  mortalidades: Mortalidad[],
  fechaIngreso: string,
  cantidadInicial: number,
  diaActual: number,
  curva: PuntoCurvaGenetica[],
): PuntoDia[] {
  if (!Number.isFinite(cantidadInicial) || cantidadInicial <= 0) return []
  const muertes = muertesPorDia(mortalidades, fechaIngreso, diaActual)
  if (muertes === null || [...muertes.values()].reduce((total, cantidad) => total + cantidad, 0) > cantidadInicial) return []
  const alimentoPorDia = new Map<number, number>()
  for (const consumo of consumos) {
    if (consumo.alimento_kg === null || !Number.isFinite(consumo.alimento_kg) || consumo.alimento_kg < 0) continue
    const dia = diaDeRegistro(fechaIngreso, consumo.fecha)
    if (dia <= 0 || dia > diaActual) continue
    alimentoPorDia.set(dia, (alimentoPorDia.get(dia) ?? 0) + consumo.alimento_kg)
  }
  const porDia = new Map(curva.map((punto) => [punto.dia, punto.consumo_diario_g]))
  return Array.from({ length: diaActual }, (_, indice) => {
    const dia = indice + 1
    const avesAlInicioDelDia = cantidadInicial - [...muertes.entries()]
      .filter(([diaMuerte]) => diaMuerte < dia)
      .reduce((total, [, cantidad]) => total + cantidad, 0)
    const kg = alimentoPorDia.get(dia)
    const real = kg === undefined || avesAlInicioDelDia <= 0 ? null : (kg * 1000) / avesAlInicioDelDia
    const esperado = porDia.get(dia)
    return {
      dia,
      real: real !== null && Number.isFinite(real) ? real : null,
      esperado: esperado !== undefined && esperado !== null && Number.isFinite(esperado) ? esperado : null,
    }
  })
}

export function serieMortalidad(
  registros: Mortalidad[],
  fechaIngreso: string,
  cantidadInicial: number,
  diaActual: number,
): PuntoDia[] {
  if (!Number.isFinite(cantidadInicial) || cantidadInicial <= 0) return []
  const muertes = muertesPorDia(registros, fechaIngreso, diaActual)
  if (muertes === null) return []
  if ([...muertes.values()].reduce((total, cantidad) => total + cantidad, 0) > cantidadInicial) return []
  let acumulado = 0
  return [...muertes.entries()]
    .sort(([diaA], [diaB]) => diaA - diaB)
    .map(([dia, cantidad]) => {
      acumulado += cantidad
      return { dia, real: (acumulado / cantidadInicial) * 100, esperado: null }
    })
}

export function serieFcr(
  indicadores: IndicadorLote[],
  curva: PuntoCurvaGenetica[],
): PuntoDia[] {
  const objetivoPorDia = new Map(curva.map((punto) => [punto.dia, punto.fcr_objetivo]))
  return indicadores
    .filter((indicador) => indicador.estado_calculo === 'calculado'
      && indicador.dia_vida !== null
      && indicador.fcr !== null
      && Number.isFinite(indicador.fcr))
    .map((indicador) => {
      const esperado = objetivoPorDia.get(indicador.dia_vida!)
      return {
        dia: indicador.dia_vida!,
        real: indicador.fcr,
        esperado: esperado !== undefined && esperado !== null && Number.isFinite(esperado) ? esperado : null,
      }
    })
    .sort((a, b) => a.dia - b.dia)
}

export function serieAmbiente(
  mediciones: Medicion[],
  sensores: Array<{ sensor_id: number; tipo: string }>,
): PuntoAmbiente[] {
  const tipos = new Map(sensores.map((sensor) => [sensor.sensor_id, sensor.tipo.toLowerCase()]))
  const porHora = new Map<string, { temperatura: number[]; humedad: number[] }>()
  for (const medicion of mediciones) {
    const tipo = tipos.get(medicion.sensor_id) ?? ''
    const categoria = tipo.includes('temp') ? 'temperatura' : tipo.includes('hum') ? 'humedad' : null
    if (categoria === null || !Number.isFinite(medicion.valor)) continue
    const fecha = new Date(medicion.fecha_hora)
    if (Number.isNaN(fecha.getTime())) continue
    fecha.setMinutes(0, 0, 0)
    const clave = fecha.toISOString()
    const actual = porHora.get(clave) ?? { temperatura: [], humedad: [] }
    actual[categoria].push(medicion.valor)
    porHora.set(clave, actual)
  }
  return [...porHora.entries()]
    .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
    .map(([fecha, valores]) => ({
      fecha,
      temperatura: valores.temperatura.length ? valores.temperatura.reduce((a, b) => a + b, 0) / valores.temperatura.length : null,
      humedad: valores.humedad.length ? valores.humedad.reduce((a, b) => a + b, 0) / valores.humedad.length : null,
    }))
}
