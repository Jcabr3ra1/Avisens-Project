export type PuntoCurva = {
  dia: number
  pesoEsperadoG: number
  consumoAcumuladoG?: number | null
  fcrObjetivo?: number | null
}

export type ResultadoDiaObjetivo =
  | {
      estado: 'calculado'
      diaObjetivo: number
      diaInterpolado: number
    }
  | { estado: 'fuera_de_rango' }
  | { estado: 'datos_insuficientes' }

function puntosOrdenados(puntos: PuntoCurva[]): PuntoCurva[] {
  return puntos
    .filter((punto) => Number.isFinite(punto.dia) && Number.isFinite(punto.pesoEsperadoG))
    .sort((a, b) => a.dia - b.dia)
}

export function calcularDiaObjetivo(
  puntos: PuntoCurva[],
  pesoObjetivoG: number,
): ResultadoDiaObjetivo {
  const ordenados = puntosOrdenados(puntos)
  if (ordenados.length < 2 || !Number.isFinite(pesoObjetivoG)) {
    return { estado: 'datos_insuficientes' }
  }

  const primero = ordenados[0]
  const ultimo = ordenados[ordenados.length - 1]
  if (pesoObjetivoG < primero.pesoEsperadoG || pesoObjetivoG > ultimo.pesoEsperadoG) {
    return { estado: 'fuera_de_rango' }
  }

  if (pesoObjetivoG === primero.pesoEsperadoG) {
    return { estado: 'calculado', diaObjetivo: primero.dia, diaInterpolado: primero.dia }
  }

  for (let indice = 1; indice < ordenados.length; indice += 1) {
    const anterior = ordenados[indice - 1]
    const actual = ordenados[indice]
    if (pesoObjetivoG > actual.pesoEsperadoG) continue

    const diferenciaPeso = actual.pesoEsperadoG - anterior.pesoEsperadoG
    if (diferenciaPeso === 0) {
      return { estado: 'calculado', diaObjetivo: actual.dia, diaInterpolado: actual.dia }
    }
    const proporcion = (pesoObjetivoG - anterior.pesoEsperadoG) / diferenciaPeso
    const diaInterpolado = anterior.dia + proporcion * (actual.dia - anterior.dia)
    return {
      estado: 'calculado',
      diaObjetivo: Math.ceil(diaInterpolado),
      diaInterpolado,
    }
  }

  return { estado: 'calculado', diaObjetivo: ultimo.dia, diaInterpolado: ultimo.dia }
}

export type ResultadoPesoEnDia =
  | { estado: 'calculado'; pesoEsperadoG: number }
  | { estado: 'fuera_de_rango' }
  | { estado: 'datos_insuficientes' }

export type ResultadoPuntoEnDia =
  | {
      estado: 'calculado'
      pesoEsperadoG: number
      consumoAcumuladoG: number | null
      fcrObjetivo: number | null
    }
  | { estado: 'fuera_de_rango' }
  | { estado: 'datos_insuficientes' }

function interpolarValor(anterior: number | null | undefined, actual: number | null | undefined, proporcion: number): number | null {
  if (!Number.isFinite(anterior) || !Number.isFinite(actual)) return null
  return (anterior as number) + proporcion * ((actual as number) - (anterior as number))
}

export function interpolarPuntoEnDia(
  puntos: PuntoCurva[],
  diaObjetivo: number,
): ResultadoPuntoEnDia {
  const ordenados = puntosOrdenados(puntos)
  if (ordenados.length < 2 || !Number.isFinite(diaObjetivo)) {
    return { estado: 'datos_insuficientes' }
  }
  const primero = ordenados[0]
  const ultimo = ordenados[ordenados.length - 1]
  if (diaObjetivo < 1 || diaObjetivo > 42 || diaObjetivo < primero.dia || diaObjetivo > ultimo.dia) {
    return { estado: 'fuera_de_rango' }
  }
  if (diaObjetivo === primero.dia) {
    return {
      estado: 'calculado',
      pesoEsperadoG: primero.pesoEsperadoG,
      consumoAcumuladoG: primero.consumoAcumuladoG ?? null,
      fcrObjetivo: primero.fcrObjetivo ?? null,
    }
  }

  for (let indice = 1; indice < ordenados.length; indice += 1) {
    const anterior = ordenados[indice - 1]
    const actual = ordenados[indice]
    if (diaObjetivo > actual.dia) continue
    const proporcion = (diaObjetivo - anterior.dia) / (actual.dia - anterior.dia)
    return {
      estado: 'calculado',
      pesoEsperadoG: anterior.pesoEsperadoG + proporcion * (actual.pesoEsperadoG - anterior.pesoEsperadoG),
      consumoAcumuladoG: interpolarValor(anterior.consumoAcumuladoG, actual.consumoAcumuladoG, proporcion),
      fcrObjetivo: interpolarValor(anterior.fcrObjetivo, actual.fcrObjetivo, proporcion),
    }
  }
  return {
    estado: 'calculado',
    pesoEsperadoG: ultimo.pesoEsperadoG,
    consumoAcumuladoG: ultimo.consumoAcumuladoG ?? null,
    fcrObjetivo: ultimo.fcrObjetivo ?? null,
  }
}

export function interpolarPesoEnDia(
  puntos: PuntoCurva[],
  diaObjetivo: number,
): ResultadoPesoEnDia {
  const ordenados = puntosOrdenados(puntos)
  if (ordenados.length < 2 || !Number.isFinite(diaObjetivo)) {
    return { estado: 'datos_insuficientes' }
  }
  const primero = ordenados[0]
  const ultimo = ordenados[ordenados.length - 1]
  if (diaObjetivo < 1 || diaObjetivo > 42 || diaObjetivo < primero.dia || diaObjetivo > ultimo.dia) {
    return { estado: 'fuera_de_rango' }
  }
  if (diaObjetivo === primero.dia) return { estado: 'calculado', pesoEsperadoG: primero.pesoEsperadoG }

  for (let indice = 1; indice < ordenados.length; indice += 1) {
    const anterior = ordenados[indice - 1]
    const actual = ordenados[indice]
    if (diaObjetivo > actual.dia) continue
    const proporcion = (diaObjetivo - anterior.dia) / (actual.dia - anterior.dia)
    return {
      estado: 'calculado',
      pesoEsperadoG: anterior.pesoEsperadoG + proporcion * (actual.pesoEsperadoG - anterior.pesoEsperadoG),
    }
  }
  return { estado: 'calculado', pesoEsperadoG: ultimo.pesoEsperadoG }
}