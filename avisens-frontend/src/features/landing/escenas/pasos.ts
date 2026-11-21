export function pasoAcotado(indice: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(total - 1, Math.max(0, indice))
}

export function pasoDesdeTecla(tecla: string, actual: number, total: number): number | null {
  if (total <= 0) return null
  switch (tecla) {
    case 'ArrowRight':
    case 'ArrowDown':
      return pasoAcotado(actual + 1, total)
    case 'ArrowLeft':
    case 'ArrowUp':
      return pasoAcotado(actual - 1, total)
    case 'Home':
      return 0
    case 'End':
      return total - 1
    default:
      return null
  }
}
