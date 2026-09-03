// Cálculos de la página de granja. Todo lo que se puede derivar sin pedirle
// nada al servidor vive aquí, puro y probado, para que los componentes solo
// se ocupen de pintar.

import type { EstadoSensorVista, SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'

export { diasDeVida } from '@shared/utils/fechas'

// Semáforo operativo de un galpón. Nace del peor sensor: si uno solo está
// crítico, el galpón está en alerta aunque los demás vayan bien.
export type EstadoOperativo = 'normal' | 'atencion' | 'alerta' | 'inactivo' | 'sin_datos'

export const ETIQUETA_ESTADO: Record<EstadoOperativo, string> = {
  normal: 'Normal',
  atencion: 'Atención',
  alerta: 'Alerta',
  inactivo: 'Inactivo',
  sin_datos: 'Sin datos',
}

export function estadoOperativoDeGalpon(
  activo: boolean,
  sensores: SensorVista[],
): EstadoOperativo {
  if (!activo) return 'inactivo'
  if (sensores.length === 0) return 'sin_datos'
  if (sensores.some((sensor) => sensor.estado === 'critico')) return 'alerta'
  if (sensores.some((sensor) => sensor.estado === 'advertencia')) return 'atencion'
  if (sensores.every((sensor) => sensor.estado === 'offline')) return 'sin_datos'
  return 'normal'
}

// Recuento de sensores por salud, para el bloque "Sensores" del galpón.
export type ConteoSensores = {
  total: number
  enLinea: number
  offline: number
  conAlerta: number
}

export function contarSensores(sensores: SensorVista[]): ConteoSensores {
  const esAlerta = (estado: EstadoSensorVista) => estado === 'critico' || estado === 'advertencia'
  return {
    total: sensores.length,
    enLinea: sensores.filter((sensor) => sensor.estado !== 'offline').length,
    offline: sensores.filter((sensor) => sensor.estado === 'offline').length,
    conAlerta: sensores.filter((sensor) => esAlerta(sensor.estado)).length,
  }
}

// La primera lectura cuyo tipo coincide. `tipo` es texto libre en el backend
// ("temperatura", "Temp. ambiente"…), así que se compara por fragmento.
export function lecturaPorTipo(sensores: SensorVista[], fragmento: string): SensorVista | null {
  const buscado = fragmento.toLowerCase()
  return (
    sensores.find(
      (sensor) => sensor.tipo.toLowerCase().includes(buscado) && sensor.valor !== null,
    ) ?? null
  )
}


// Aves que quedan vivas: las que entraron menos la mortalidad acumulada.
// Sin dato de mortalidad no se inventa nada — se devuelve el inicial.
export function avesActuales(
  cantidadInicial: number,
  mortalidadAcumuladaPct: number | null,
): number {
  if (mortalidadAcumuladaPct === null) return cantidadInicial
  const vivas = cantidadInicial * (1 - mortalidadAcumuladaPct / 100)
  return Math.max(Math.round(vivas), 0)
}

// Aves por m². Es el indicador de hacinamiento; sin medidas del galpón no
// se puede calcular y devolver 0 mentiría.
export function densidad(aves: number, anchoM: number | null, largoM: number | null): number | null {
  if (anchoM === null || largoM === null) return null
  const area = anchoM * largoM
  if (area <= 0) return null
  return aves / area
}

export function porcentajeOcupacion(aves: number, capacidad: number | null): number | null {
  if (capacidad === null || capacidad <= 0) return null
  return (aves / capacidad) * 100
}

// ─── Resumen de la granja ───

export type ResumenGranja = {
  galpones: number
  galponesActivos: number
  capacidadInstalada: number
  avesAlojadas: number
  lotesActivos: number
  alertasAbiertas: number
}

type GalponResumible = {
  activo: boolean
  capacidadAves: number | null
  loteActivo: { cantidadInicial: number } | null
}

export function resumirGranja(
  galpones: GalponResumible[],
  alertasAbiertas: number,
): ResumenGranja {
  return {
    galpones: galpones.length,
    galponesActivos: galpones.filter((galpon) => galpon.activo).length,
    capacidadInstalada: galpones.reduce(
      (total, galpon) => total + (galpon.capacidadAves ?? 0),
      0,
    ),
    avesAlojadas: galpones.reduce(
      (total, galpon) => total + (galpon.loteActivo?.cantidadInicial ?? 0),
      0,
    ),
    lotesActivos: galpones.filter((galpon) => galpon.loteActivo !== null).length,
    alertasAbiertas,
  }
}

// ─── Series para las gráficas ───

// Los indicadores llegan del más reciente al más viejo; una gráfica de
// evolución se lee al revés.
export function serieCronologica<T extends { fecha: string }>(indicadores: T[]): T[] {
  return [...indicadores].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  )
}

// Puntos de una serie a coordenadas de un SVG de ancho x alto. Devuelve []
// si no hay al menos dos valores: una línea de un solo punto no es evolución.
export function puntosDeGrafica(
  valores: (number | null)[],
  ancho: number,
  alto: number,
): { x: number; y: number }[] {
  const definidos = valores.filter((valor): valor is number => valor !== null)
  if (definidos.length < 2) return []

  const min = Math.min(...definidos)
  const max = Math.max(...definidos)
  const rango = max - min || 1
  const paso = ancho / (definidos.length - 1)

  return definidos.map((valor, indice) => ({
    x: indice * paso,
    y: alto - ((valor - min) / rango) * alto,
  }))
}
