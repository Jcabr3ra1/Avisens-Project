export type Tramo = [desde: number, hasta: number, cuadroInicio: number, cuadroFin: number]

export function cuadroParaProgreso(progreso: number, tramos: Tramo[]): number {
  for (const [desde, hasta, inicio, fin] of tramos) {
    if (progreso <= hasta) {
      const t = Math.min(1, Math.max(0, (progreso - desde) / (hasta - desde || 1)))
      return Math.round(inicio + (fin - inicio) * t)
    }
  }
  const ultimo = tramos[tramos.length - 1]
  return ultimo ? ultimo[3] : 0
}
