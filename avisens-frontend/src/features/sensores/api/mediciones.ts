import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface Medicion {
  // `id` es BigInt en el backend, por eso llega como string (no cabe en number).
  id: string
  sensor_id: number
  fecha_hora: string
  valor: number
  calidad: string
}

// Filtros de GET /mediciones. Todo opcional; el backend pagina y ordena por
// fecha_hora descendente (lo más reciente primero).

export interface MedicionesQuery {
  sensor_id?: number
  desde?: string
  hasta?: string
  page?: number
  limit?: number
}


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
