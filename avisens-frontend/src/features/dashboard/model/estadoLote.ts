import type { EstadoCalculoIndicador } from '@features/indicadores/api/indicadores'
import type { DashboardIndicador } from './dashboard'

export type Fila = {
  etiqueta: string
  valor: string
  nota?: string
  alerta?: boolean
  mono?: boolean
}

// Compara contra la curva objetivo. Sin curva sembrada no hay con qué
// comparar, y decirlo vale más que ocultar la fila.
export function textoComparacion(
  desvioPct: number | null | undefined,
  objetivo: number | null | undefined,
  unidad: string,
): string | undefined {
  if (desvioPct === null || desvioPct === undefined) return undefined
  const meta = objetivo === null || objetivo === undefined
    ? ''
    : ` · meta ${objetivo}${unidad ? ` ${unidad}` : ''}`
  if (desvioPct > 0) return `+${desvioPct}% sobre la curva${meta}`
  if (desvioPct < 0) return `${desvioPct}% bajo la curva${meta}`
  return `en la curva${meta}`
}

// FCR no es un porcentaje: el backend manda la diferencia absoluta
// (real - objetivo). Un texto separado evita el "%" que solo aplica al peso.
export function textoComparacionFcr(
  desvio: number | null | undefined,
  objetivo: number | null | undefined,
): string | undefined {
  if (desvio === null || desvio === undefined) return undefined
  const meta = objetivo === null || objetivo === undefined ? '' : ` · meta ${objetivo}`
  if (desvio > 0) return `+${desvio} sobre la curva${meta}`
  if (desvio < 0) return `${desvio} bajo la curva${meta}`
  return `en la curva${meta}`
}

// FCR/EPEF van al corte del pesaje, no de hoy -- sin la fecha, "1.18" no
// dice si es de hoy o de hace una semana. Se ancla a mediodia local para
// no cruzar de dia por el desfase UTC (mismo criterio que el resto del
// frontend al mostrar fechas de solo-dia).
export function textoFechaPesaje(fecha: string | null | undefined): string | undefined {
  if (!fecha) return undefined
  const dia = new Date(`${fecha.slice(0, 10)}T12:00:00`)
  return `al ${dia.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
}

// La comparacion contra la curva puede venir de un dia distinto al que se
// muestra como cifra principal (p. ej. hoy quedo mortalidad_incoherente y
// el ultimo indicador "calculado" es de ayer). Sin este chequeo, la nota de
// desvio parece hablar del dato de hoy cuando en realidad es de otro dia.
export function comparacionVigente(
  fechaDatoUsado: string | null | undefined,
  fechaReciente: string | null | undefined,
): boolean {
  if (!fechaDatoUsado || !fechaReciente) return false
  return new Date(fechaDatoUsado).getTime() === new Date(fechaReciente).getTime()
}

// Dos peticiones HTTP independientes (indicadores y comparacion) pueden
// ver revisiones distintas de la MISMA fila si hubo un recalculo entre
// una y otra -- coincidir en fecha no garantiza coincidir en la version
// exacta de esa fila.
export function mismaRevision(
  revisionDatoUsado: number | null | undefined,
  revisionReciente: number | null | undefined,
): boolean {
  if (revisionDatoUsado == null || revisionReciente == null) return false
  return revisionDatoUsado === revisionReciente
}

// legado_sin_verificar es dato real de antes de la migracion de coherencia:
// nunca paso por el chequeo nuevo. No se retrocede a otra fila ni se borra
// el historico -- solo se deja de presentar el numero como valido cuando
// la fila que se muestra no es un calculo verificado.
export function esDatoVerificado(estadoCalculo: EstadoCalculoIndicador | undefined): boolean {
  return estadoCalculo === 'calculado'
}

// El resumen del sparkline es "el peso actual" -- no puede venir de una fila
// distinta a la que se muestra como estado actual (aunque una fila anterior
// tenga un peso real y verificado), ni de una fila sin peso verificado.
export function pesoActualParaSparkline(reciente: DashboardIndicador | null): number | null {
  if (!reciente || !esDatoVerificado(reciente.estadoCalculo)) return null
  return reciente.pesoPromedioG
}

// El sparkline es una serie de crecimiento VERIFICADO: una fila
// legado_sin_verificar puede traer un peso real, pero nunca paso por el
// chequeo nuevo -- no cuenta como parte de la tendencia confiable.
export function serieDePesoVerificado(indicadores: DashboardIndicador[]): number[] {
  return indicadores
    .filter((indicador) => esDatoVerificado(indicador.estadoCalculo))
    .map((indicador) => indicador.pesoPromedioG)
    .filter((peso): peso is number => peso !== null)
}

// El chip "vs. curva" solo puede mostrar el desvio si la comparacion es del
// mismo dia que la fila mas reciente -- si no, estaria hablando de un dia
// pasado como si fuera el estado de hoy.
export function desvioPesoVigente(
  desvioPesoPct: number | null | undefined,
  fechaDatoUsado: string | null | undefined,
  fechaReciente: string | null | undefined,
  estadoCalculoReciente: EstadoCalculoIndicador | undefined,
  revisionDatoUsado: number | null | undefined,
  revisionReciente: number | null | undefined,
): number | null {
  if (!esDatoVerificado(estadoCalculoReciente)) return null
  if (!comparacionVigente(fechaDatoUsado, fechaReciente)) return null
  if (!mismaRevision(revisionDatoUsado, revisionReciente)) return null
  return desvioPesoPct ?? null
}

// Puntos de un sparkline escalado a su propio rango. Con todos los valores
// iguales la línea se dibuja al medio, no pegada al borde.
export function lineaSparkline(valores: number[], ancho: number, alto: number): string {
  if (valores.length < 2) return ''
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const rango = maximo - minimo
  const paso = ancho / (valores.length - 1)

  return valores
    .map((valor, indice) => {
      const y = rango === 0 ? alto / 2 : alto - ((valor - minimo) / rango) * (alto - 4) - 2
      return `${(indice * paso).toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
