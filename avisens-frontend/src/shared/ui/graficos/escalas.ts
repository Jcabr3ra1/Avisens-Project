export function marcasDePeso(maximoG: number): number[] {
  const paso = maximoG > 3000 ? 1000 : 500
  const tope = Math.max(paso, Math.ceil(maximoG / paso) * paso)
  return Array.from({ length: tope / paso + 1 }, (_, i) => i * paso)
}
