import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { LIMITE_POR_PAGINA, listarTodasLasPaginas } from './paginacion'

vi.mock('./client', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

function pagina(datos: unknown[], totalPages: number, page: number) {
  return {
    data: {
      data: datos,
      meta: { total: totalPages * LIMITE_POR_PAGINA, page, limit: LIMITE_POR_PAGINA, totalPages },
    },
  }
}

function paramsDeLlamada(indice: number): Record<string, unknown> {
  return get.mock.calls[indice][1]?.params as Record<string, unknown>
}

beforeEach(() => {
  get.mockReset()
})

describe('listarTodasLasPaginas', () => {
  it('con una sola página no hace una segunda petición', async () => {
    get.mockResolvedValueOnce(pagina([{ id: 1 }], 1, 1) as never)

    const filas = await listarTodasLasPaginas('/umbrales')

    expect(filas).toEqual([{ id: 1 }])
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('junta todas las páginas en orden', async () => {
    get.mockResolvedValueOnce(pagina([{ id: 1 }], 3, 1) as never)
    get.mockResolvedValueOnce(pagina([{ id: 2 }], 3, 2) as never)
    get.mockResolvedValueOnce(pagina([{ id: 3 }], 3, 3) as never)

    const filas = await listarTodasLasPaginas<{ id: number }>('/umbrales')

    expect(filas.map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('nunca pide un limit que el backend rechazaría con 400', async () => {
    get.mockResolvedValueOnce(pagina([], 1, 1) as never)

    await listarTodasLasPaginas('/mediciones')

    expect(paramsDeLlamada(0).limit).toBeLessThanOrEqual(100)
  })

  it('conserva los filtros de quien llama en todas las páginas', async () => {
    get.mockResolvedValueOnce(pagina([{ id: 1 }], 2, 1) as never)
    get.mockResolvedValueOnce(pagina([{ id: 2 }], 2, 2) as never)

    await listarTodasLasPaginas('/umbrales', { galpon_id: 7 })

    // Si el filtro se perdiera en la página 2 se colarían filas de otro
    // galpón, que es peor que no traerlas.
    expect(paramsDeLlamada(0).galpon_id).toBe(7)
    expect(paramsDeLlamada(1).galpon_id).toBe(7)
  })

  it('no deja que quien llama pise page ni limit', async () => {
    get.mockResolvedValueOnce(pagina([], 1, 1) as never)

    await listarTodasLasPaginas('/mediciones', { page: 9, limit: 500 })

    expect(paramsDeLlamada(0).page).toBe(1)
    expect(paramsDeLlamada(0).limit).toBe(LIMITE_POR_PAGINA)
  })

  it('sin resultados devuelve una lista vacía, no falla', async () => {
    get.mockResolvedValueOnce(pagina([], 0, 1) as never)

    await expect(listarTodasLasPaginas('/umbrales')).resolves.toEqual([])
  })
})
