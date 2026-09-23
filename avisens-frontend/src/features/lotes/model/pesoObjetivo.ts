// 1 libra = 453.59237 gramos exactos (definición internacional). El backend
// solo exige @IsNumber() @IsPositive() en peso_objetivo_g -- redondear a
// gramo entero es una decisión nuestra, no una restricción suya.
const GRAMOS_POR_LIBRA = 453.59237

export function librasAGramos(libras: number): number {
  return Math.round(libras * GRAMOS_POR_LIBRA)
}

export function gramosALibras(gramos: number): number {
  return gramos / GRAMOS_POR_LIBRA
}
