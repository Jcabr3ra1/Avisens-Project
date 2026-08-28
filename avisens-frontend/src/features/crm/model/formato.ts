export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export function metros(m2: number): string {
  if (m2 >= 10_000) return `${Math.round(m2 / 1000)}k m²`
  if (m2 >= 1000) return `${(m2 / 1000).toFixed(1)}k m²`
  return `${m2} m²`
}
