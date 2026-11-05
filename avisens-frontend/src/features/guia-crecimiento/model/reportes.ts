export type ValorCsv = string | number | null

function celdaCsv(valor: ValorCsv): string {
  if (valor === null) return '""'
  const texto = String(valor)
  const seguro = typeof valor === 'string' && /^[\s]*[=+\-@]/.test(texto)
    ? `'${texto}`
    : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

export function crearCsv(encabezados: string[], filas: ValorCsv[][]): string {
  return `\uFEFF${[encabezados, ...filas]
    .map((fila) => fila.map(celdaCsv).join(','))
    .join('\r\n')}`
}
