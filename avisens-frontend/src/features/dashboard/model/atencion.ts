export type TonoAtencion = 'ok' | 'info' | 'advertencia' | 'peligro'

export type ChipAtencion = {
  id: string
  tono: TonoAtencion
  valor: string
  etiqueta: string
  detalle: string
  destino: string
}

// Los umbrales viven aquí y no en el JSX: son reglas de negocio —cuándo la
// mortalidad preocupa, cuándo un desvío deja de ser ruido— y se ajustan sin
// abrir el componente.
const MORTALIDAD_ADVERTENCIA_PCT = 2
const DESVIO_ADVERTENCIA_PCT = 5
const DESVIO_PELIGRO_PCT = 10

export function tonoPorAlertas(activas: number): TonoAtencion {
  return activas === 0 ? 'ok' : 'peligro'
}

export function tonoPorMortalidad(porcentaje: number | null): TonoAtencion {
  if (porcentaje === null) return 'info'
  return porcentaje >= MORTALIDAD_ADVERTENCIA_PCT ? 'advertencia' : 'ok'
}

export function tonoPorSensores(fueraDeRango: number, offline: number): TonoAtencion {
  if (fueraDeRango > 0) return 'peligro'
  if (offline > 0) return 'advertencia'
  return 'ok'
}

export function tonoPorDesvio(desvioPct: number | null): TonoAtencion {
  if (desvioPct === null) return 'info'
  const magnitud = Math.abs(desvioPct)
  if (magnitud >= DESVIO_PELIGRO_PCT) return 'peligro'
  if (magnitud >= DESVIO_ADVERTENCIA_PCT) return 'advertencia'
  return 'ok'
}

// Reemplaza el "1 alta · 1 media" que la maqueta traía quemado.
export function detallePorCriticidad(altas: number, medias: number): string {
  if (altas === 0 && medias === 0) return 'sin incidencias'
  const partes: string[] = []
  if (altas > 0) partes.push(`${altas} alta${altas === 1 ? '' : 's'}`)
  if (medias > 0) partes.push(`${medias} media${medias === 1 ? '' : 's'}`)
  return partes.join(' · ')
}

export function detallePorSensores(fueraDeRango: number, offline: number): string {
  if (fueraDeRango === 0 && offline === 0) return 'todos en rango'
  const partes: string[] = []
  if (fueraDeRango > 0) partes.push(`${fueraDeRango} fuera de rango`)
  if (offline > 0) partes.push(`${offline} sin señal`)
  return partes.join(' · ')
}

// La tendencia se calcula contra el indicador del día anterior. Si no hay con
// qué comparar se dice, en vez de inventar una flecha.
export function detallePorTendencia(
  actual: number | null,
  previo: number | null,
): string {
  if (actual === null) return 'sin registro'
  if (previo === null) return 'primer registro'
  const diferencia = Math.round((actual - previo) * 100) / 100
  if (diferencia > 0) return `↑ ${diferencia} vs. ayer`
  if (diferencia < 0) return `↓ ${Math.abs(diferencia)} vs. ayer`
  return '= vs. ayer'
}

export function detallePorDesvio(desvioPct: number | null): string {
  if (desvioPct === null) return 'sin curva objetivo'
  if (desvioPct > 0) return `+${desvioPct}% sobre la curva`
  if (desvioPct < 0) return `${desvioPct}% bajo la curva`
  return 'en la curva'
}
