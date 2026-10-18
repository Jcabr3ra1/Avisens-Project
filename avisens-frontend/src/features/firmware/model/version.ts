export const VERSION_VALIDA = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/

export function siguienteVersion(versiones: string[]): string {
  const ordenadas = versiones
    .filter((v) => VERSION_VALIDA.test(v))
    .map((v) => v.split('.').map(Number))
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])
  if (ordenadas.length === 0) return '1.0.0'
  const [mayor, menor, parche] = ordenadas[0]
  return `${mayor}.${menor}.${parche + 1}`
}
