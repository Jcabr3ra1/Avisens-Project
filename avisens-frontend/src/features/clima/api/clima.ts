import { api } from '@shared/api/client'

export interface LecturaClima {
  id: number
  granja_id: number
  fecha_hora: string
  temperatura: number | null
  humedad: number | null
  precipitacion: number | null
  viento_kmh: number | null
  fuente: string | null
}

export async function listarClimaDeGranja(
  granjaId: number,
): Promise<LecturaClima[]> {
  const { data } = await api.get<LecturaClima[]>(`/granjas/${granjaId}/clima`)
  return data
}

export async function traerClimaAhora(granjaId: number): Promise<LecturaClima> {
  const { data } = await api.post<LecturaClima>(
    `/granjas/${granjaId}/clima/traer`,
    {},
  )
  return data
}
