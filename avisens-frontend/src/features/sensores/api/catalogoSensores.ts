import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface CatalogoSensor {
  id: number
  tipo_sensor: string
  nombre: string
  descripcion: string | null
  precio_unitario_cop: number
  cobertura_m2: number | null
  obligatorio: boolean
  activo: boolean
}

export async function listarCatalogoSensores(): Promise<CatalogoSensor[]> {
  const { data } = await api.get<PaginatedResponse<CatalogoSensor>>(
    '/catalogo-sensores',
    { params: { limit: 100 } },
  )
  return data.data
}
