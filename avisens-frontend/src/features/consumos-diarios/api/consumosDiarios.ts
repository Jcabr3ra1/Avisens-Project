import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type { ConsumoDiario, CrearConsumoDiarioPayload } from '../model/consumoDiario'

export type { ConsumoDiario, CrearConsumoDiarioPayload } from '../model/consumoDiario'

// El backend tope a 100 por página (@Max(100) en PaginationQueryDto) y no
// recorta: pedir más devuelve 400. Y quedarse con la primera página callaría
// los consumos viejos, que es peor: los totales de alimento y agua saldrían
// cortos sin que nada avise. Así que se piden todas las páginas.
const LIMITE_POR_PAGINA = 100

export async function listarConsumosDiarios(): Promise<ConsumoDiario[]> {
  const primeraRespuesta = await api.get<PaginatedResponse<ConsumoDiario>>('/consumos-diarios', {
    params: { page: 1, limit: LIMITE_POR_PAGINA },
  })
  const primeraPagina = primeraRespuesta.data

  if (primeraPagina.meta.totalPages <= 1) return primeraPagina.data

  const restantes = await Promise.all(
    Array.from({ length: primeraPagina.meta.totalPages - 1 }, (_, indice) =>
      api.get<PaginatedResponse<ConsumoDiario>>('/consumos-diarios', {
        params: { page: indice + 2, limit: LIMITE_POR_PAGINA },
      }),
    ),
  )

  return [
    ...primeraPagina.data,
    ...restantes.flatMap((respuesta) => respuesta.data.data),
  ]
}

export async function crearConsumoDiario(payload: CrearConsumoDiarioPayload): Promise<ConsumoDiario> {
  const { data } = await api.post<ConsumoDiario>('/consumos-diarios', payload)
  return data
}

export async function actualizarConsumoDiario(id: number, payload: Partial<CrearConsumoDiarioPayload>): Promise<ConsumoDiario> {
  const { data } = await api.patch<ConsumoDiario>(`/consumos-diarios/${id}`, payload)
  return data
}

export async function eliminarConsumoDiario(id: number): Promise<void> { await api.delete(`/consumos-diarios/${id}`) }

export async function obtenerConsumoDiario(id: number): Promise<ConsumoDiario> {
  const { data } = await api.get<ConsumoDiario>(`/consumos-diarios/${id}`)
  return data
}
