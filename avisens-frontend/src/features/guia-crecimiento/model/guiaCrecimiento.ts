import { calcularDiaObjetivo, interpolarPesoEnDia, type PuntoCurva } from './interpolarDiaObjetivo'

export { interpolarPesoEnDia } from './interpolarDiaObjetivo'
export { interpolarPuntoEnDia } from './interpolarDiaObjetivo'

export const GRAMOS_POR_LIBRA = 453.59237
export const MARGEN_JUSTO_DIAS = 1

export type EstadoGuia =
  | 'calculado'
  | 'justo'
  | 'no_alcanzable'
  | 'sin_curva'
  | 'fuera_de_rango'
  | 'datos_insuficientes'
  | 'plazo_vencido'

export type ResultadoGuia = {
  estado: EstadoGuia
  diaObjetivo: number | null
  diaInterpolado: number | null
  pesoEsperadoEnPlazoG: number | null
  margenDias: number | null
}

export function librasAGramos(libras: number): number {
  return libras * GRAMOS_POR_LIBRA
}

export function gramosALibras(gramos: number): number {
  return gramos / GRAMOS_POR_LIBRA
}

function leerFecha(fecha: string): [number, number, number] | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!partes) return null
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia))
  if (
    comprobacion.getUTCFullYear() !== anio
    || comprobacion.getUTCMonth() !== mes - 1
    || comprobacion.getUTCDate() !== dia
  ) return null
  return [anio, mes, dia]
}

export function fechaParaDiaVida(fechaIngreso: string, diaVida: number): string | null {
  const partes = leerFecha(fechaIngreso)
  if (!partes || !Number.isInteger(diaVida) || diaVida < 1) return null
  const fecha = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2] + diaVida - 1))
  return fecha.toISOString().slice(0, 10)
}

export function diaDeVidaParaFecha(fechaIngreso: string, fechaObjetivo: string): number | null {
  const inicio = leerFecha(fechaIngreso)
  const objetivo = leerFecha(fechaObjetivo)
  if (!inicio || !objetivo) return null
  const inicioUtc = Date.UTC(inicio[0], inicio[1] - 1, inicio[2])
  const objetivoUtc = Date.UTC(objetivo[0], objetivo[1] - 1, objetivo[2])
  return Math.round((objetivoUtc - inicioUtc) / 86_400_000) + 1
}

export function evaluarGuia(
  puntos: PuntoCurva[],
  pesoObjetivoG: number,
  diaPlazo: number,
  diaActual: number,
  tieneCurva: boolean,
): ResultadoGuia {
  if (!tieneCurva) {
    return { estado: 'sin_curva', diaObjetivo: null, diaInterpolado: null, pesoEsperadoEnPlazoG: null, margenDias: null }
  }
  const dia = calcularDiaObjetivo(puntos, pesoObjetivoG)
  if (dia.estado !== 'calculado') {
    return { estado: dia.estado, diaObjetivo: null, diaInterpolado: null, pesoEsperadoEnPlazoG: null, margenDias: null }
  }
  const pesoEnPlazo = interpolarPesoEnDia(puntos, diaPlazo)
  const margenDias = diaPlazo - dia.diaObjetivo
  if (diaPlazo < diaActual) {
    return { estado: 'plazo_vencido', diaObjetivo: dia.diaObjetivo, diaInterpolado: dia.diaInterpolado, pesoEsperadoEnPlazoG: pesoEnPlazo.estado === 'calculado' ? pesoEnPlazo.pesoEsperadoG : null, margenDias }
  }
  if (pesoEnPlazo.estado === 'fuera_de_rango') {
    return { estado: 'fuera_de_rango', diaObjetivo: dia.diaObjetivo, diaInterpolado: dia.diaInterpolado, pesoEsperadoEnPlazoG: null, margenDias }
  }
  if (pesoEnPlazo.estado === 'datos_insuficientes') {
    return { estado: 'datos_insuficientes', diaObjetivo: dia.diaObjetivo, diaInterpolado: dia.diaInterpolado, pesoEsperadoEnPlazoG: null, margenDias }
  }
  return {
    estado: margenDias >= 0 && margenDias <= MARGEN_JUSTO_DIAS ? 'justo' : margenDias > MARGEN_JUSTO_DIAS ? 'calculado' : 'no_alcanzable',
    diaObjetivo: dia.diaObjetivo,
    diaInterpolado: dia.diaInterpolado,
    pesoEsperadoEnPlazoG: pesoEnPlazo.pesoEsperadoG,
    margenDias,
  }
}

export function calcularDesvioPct(pesoRealG: number | null, pesoEsperadoG: number | null): number | null {
  if (pesoRealG === null || pesoEsperadoG === null || pesoEsperadoG === 0) return null
  return ((pesoRealG - pesoEsperadoG) / pesoEsperadoG) * 100
}

export function proyectarPesoOrientativo(pesoRealG: number, pesoEsperadoG: number, pesoObjetivoG: number): number | null {
  if (pesoEsperadoG <= 0 || pesoRealG < 0 || pesoObjetivoG < 0) return null
  return pesoObjetivoG * (pesoRealG / pesoEsperadoG)
}