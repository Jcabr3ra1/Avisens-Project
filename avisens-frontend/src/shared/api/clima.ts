import { api } from './client'

export interface LecturaClima {
  id: number
  granja_id: number
  temperatura_c: number | null
  humedad_pct: number | null
  condicion: string | null
  fecha_hora: string
}

export async function listarClima(granjaId: number): Promise<LecturaClima[]> {
  const { data } = await api.get<LecturaClima[]>(`/granjas/${granjaId}/clima`)
  return data
}

export async function traerClimaAhora(
  granjaId: number,
): Promise<LecturaClima> {
  const { data } = await api.post<LecturaClima>(
    `/granjas/${granjaId}/clima/traer`,
  )
  return data
}
