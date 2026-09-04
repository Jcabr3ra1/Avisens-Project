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
