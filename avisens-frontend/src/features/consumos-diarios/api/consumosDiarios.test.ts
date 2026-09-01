import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@shared/api/client'
import { listarConsumosDiarios } from './consumosDiarios'
import type { ConsumoDiario } from '../model/consumoDiario'

vi.mock('@shared/api/client', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

function consumo(id: number): ConsumoDiario {
  return { id, lote_id: 1, alimento_kg: 10, agua_litros: 20 } as ConsumoDiario
}

// Respuesta paginada tal como la arma el backend.
function pagina(datos: ConsumoDiario[], totalPages: number, page: number) {
  return {
    data: { data: datos, meta: { total: totalPages * 100, page, limit: 100, totalPages } },
  }
}

// axios tipa `params` como unknown; aquí sabemos qué le mandamos.
function paramsDeLlamada(indice: number): { page: number; limit: number } {
  return get.mock.calls[indice][1]?.params as { page: number; limit: number }
}

beforeEach(() => {
  get.mockReset()
})

describe('listarConsumosDiarios', () => {
  it('con una sola página no pide más', async () => {
    get.mockResolvedValueOnce(pagina([consumo(1), consumo(2)], 1, 1) as never)

    const consumos = await listarConsumosDiarios()

    expect(consumos).toHaveLength(2)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('junta todas las páginas cuando hay más de una', async () => {
    get.mockResolvedValueOnce(pagina([consumo(1)], 3, 1) as never)
    get.mockResolvedValueOnce(pagina([consumo(2)], 3, 2) as never)
    get.mockResolvedValueOnce(pagina([consumo(3)], 3, 3) as never)

    const consumos = await listarConsumosDiarios()

    // Lo que fallaba antes: quedarse en la primera página recortaba los
    // totales de alimento y agua sin avisar.
    expect(consumos.map((item) => item.id)).toEqual([1, 2, 3])
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('pide las páginas siguientes por número, desde la 2', async () => {
    get.mockResolvedValueOnce(pagina([consumo(1)], 3, 1) as never)
    get.mockResolvedValueOnce(pagina([consumo(2)], 3, 2) as never)
    get.mockResolvedValueOnce(pagina([consumo(3)], 3, 3) as never)

    await listarConsumosDiarios()

    const paginasPedidas = get.mock.calls.map((_, indice) => paramsDeLlamada(indice).page)
    expect(paginasPedidas).toEqual([1, 2, 3])
  })

  it('nunca pide un limit que el backend rechazaría', async () => {
    get.mockResolvedValueOnce(pagina([], 1, 1) as never)

    await listarConsumosDiarios()

    // El DTO del backend tiene @Max(100) y no recorta: 101 daría 400.
    expect(paramsDeLlamada(0).limit).toBeLessThanOrEqual(100)
  })

  it('sin registros devuelve una lista vacía, no falla', async () => {
    get.mockResolvedValueOnce(pagina([], 0, 1) as never)

    await expect(listarConsumosDiarios()).resolves.toEqual([])
  })
})
