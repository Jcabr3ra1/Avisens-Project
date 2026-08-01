import { api } from './client'
import type { Medicion, MedicionesQuery, PaginatedResponse } from './types'

// Lecturas registradas (EP-04). Requiere sesión: el Propietario solo ve las de
// sus sensores. Por defecto trae las 20 más recientes.
export async function listarMediciones(
  query: MedicionesQuery = {},
): Promise<Medicion[]> {
  const { data } = await api.get<PaginatedResponse<Medicion>>('/mediciones', {
    params: { page: 1, limit: 20, ...query },
  })
  return data.data
}
