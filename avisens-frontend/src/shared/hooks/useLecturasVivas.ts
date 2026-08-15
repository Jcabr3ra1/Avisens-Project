export type VariableLectura = 'temperatura' | 'humedad' | 'co2' | 'nh3' | 'luz'

export type LecturaViva = {
  valor: number
  ts: number
}

export type LecturasPorVariable = Partial<Record<VariableLectura, LecturaViva>>

export function useLecturasVivas(codigoGalpon: string): LecturasPorVariable {
  void codigoGalpon
  return {}
}
