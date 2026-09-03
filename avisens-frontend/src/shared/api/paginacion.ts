import { api } from './client'
import type { PaginatedResponse } from './types'

// El backend tope las páginas a 100 elementos (`@Max(100)` en
// PaginationQueryDto) y NO recorta: pedir más devuelve 400. Pedir menos de la
// cuenta tampoco avisa, simplemente faltan filas.
//
// Las dos formas de equivocarse ya costaron caro: `limit: 200` dejó sin cargar
// sensores, insumos y la gráfica de 24 h, y no pasar `limit` truncó los
// umbrales a 20 y apagó el semáforo ambiental sin un solo error en consola.
//
// Por eso esto no acepta un `limit`: quien llama pide *todo* lo que cumpla el
// filtro. Para acotar el volumen se acota el filtro (por galpón, por fecha),
// nunca el número de filas — un tope silencioso reintroduce el mismo bug.
export const LIMITE_POR_PAGINA = 100

export async function listarTodasLasPaginas<T>(
  ruta: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const primeraRespuesta = await api.get<PaginatedResponse<T>>(ruta, {
    params: { ...params, page: 1, limit: LIMITE_POR_PAGINA },
  })
  const primeraPagina = primeraRespuesta.data

  if (primeraPagina.meta.totalPages <= 1) return primeraPagina.data

  const restantes = await Promise.all(
    Array.from({ length: primeraPagina.meta.totalPages - 1 }, (_, indice) =>
      api.get<PaginatedResponse<T>>(ruta, {
        params: { ...params, page: indice + 2, limit: LIMITE_POR_PAGINA },
      }),
    ),
  )

  return [...primeraPagina.data, ...restantes.flatMap((respuesta) => respuesta.data.data)]
}
