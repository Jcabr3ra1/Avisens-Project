export type PeriodoDias = 7 | 30 | 90

export const PERIODOS: PeriodoDias[] = [7, 30, 90]

export type PuntoSerieAdmin = {
  fecha: string
  mediciones: number
  alertas: number
  aves_muertas: number
  usuarios_nuevos: number
  organizaciones_nuevas: number
}

export type MetricasAdmin = {
  generado_en: string
  dias: number
  zona_horaria: string
  actuales: {
    organizaciones_activas: number
    usuarios_activos: number
    granjas_activas: number
    galpones_activos: number
    lotes_activos: number
    aves_en_produccion: number
    mediciones_hoy: number
    alertas_abiertas: number
  }
  series: PuntoSerieAdmin[]
  periodo_anterior: {
    mediciones: number
    alertas: number
    aves_muertas: number
    usuarios_nuevos: number
    organizaciones_nuevas: number
  }
}

export type CampoSerie = Exclude<keyof PuntoSerieAdmin, 'fecha'>

export type TonoDelta = 'bueno' | 'malo' | 'neutro'

export type DeltaMetrica = {
  diferencia: number
  texto: string
  tono: TonoDelta
  direccion: 'sube' | 'baja' | 'igual'
}

const numero = new Intl.NumberFormat('es-CO')

export function sumarCampo(series: PuntoSerieAdmin[], campo: CampoSerie): number {
  return series.reduce((total, punto) => total + punto[campo], 0)
}

export function acumularCampo(series: PuntoSerieAdmin[], campo: CampoSerie): number[] {
  let total = 0
  return series.map((punto) => {
    total += punto[campo]
    return total
  })
}

export function calcularDelta(actual: number, anterior: number, dias: number, subeEsBueno: boolean, unidad = ''): DeltaMetrica {
  const diferencia = actual - anterior
  const direccion = diferencia > 0 ? 'sube' : diferencia < 0 ? 'baja' : 'igual'
  const tono: TonoDelta =
    direccion === 'igual' ? 'neutro' : (direccion === 'sube') === subeEsBueno ? 'bueno' : 'malo'
  const signo = diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''
  const cuerpo = diferencia === 0 ? 'Sin cambios' : `${signo}${numero.format(Math.abs(diferencia))}${unidad ? ` ${unidad}` : ''}`
  return { diferencia, texto: `${cuerpo} vs. ${dias} días previos`, tono, direccion }
}

export function periodoValido(valor: number): valor is PeriodoDias {
  return PERIODOS.includes(valor as PeriodoDias)
}

function aFechaLocal(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function formatearFechaCorta(fecha: string): string {
  return aFechaLocal(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace(' de ', ' ').replace('.', '')
}

export function formatearFechaLarga(fecha: string): string {
  return aFechaLocal(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatearNumero(valor: number): string {
  return numero.format(valor)
}

export function hayActividad(series: PuntoSerieAdmin[], campos: CampoSerie[]): boolean {
  return series.some((punto) => campos.some((campo) => punto[campo] > 0))
}

export type PuntoCrecimiento = {
  fecha: string
  usuarios: number
  organizaciones: number
}

export function serieCrecimiento(series: PuntoSerieAdmin[]): PuntoCrecimiento[] {
  const usuarios = acumularCampo(series, 'usuarios_nuevos')
  const organizaciones = acumularCampo(series, 'organizaciones_nuevas')
  return series.map((punto, indice) => ({
    fecha: punto.fecha,
    usuarios: usuarios[indice],
    organizaciones: organizaciones[indice],
  }))
}
