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

// Si el usuario no tocó el campo, se reenvía el gramo original tal cual:
// redondear por libras perdería precisión (2500 g -> "5.51" lb -> 2499 g) y
// crearía una versión nueva del plan sin que nada haya cambiado de verdad.
export function pesoAEnviar(pesoActualG: number | null, editado: boolean, libras: number): number {
  return !editado && pesoActualG !== null ? pesoActualG : librasAGramos(libras)
}
