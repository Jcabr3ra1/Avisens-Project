import { useEffect, useRef, useState } from 'react'
import { obtenerIndicadoresDeLote } from '@features/dashboard/api/dashboard'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { serieCronologica } from '../model/estructura'

export type IndicadoresDeLote = {
  serie: DashboardIndicador[]
  ultimo: DashboardIndicador | null
}

// Indicadores de varios lotes a la vez, con caché.
//
// `/indicadores/:loteId` es por lote, así que mostrar el desempeño de cada
// galpón obliga a varias peticiones. Se lanzan en paralelo y se recuerda lo
// ya traído: expandir y contraer un galpón no vuelve a pedir nada, y añadir
// un lote nuevo a la lista solo pide ese.
export function useIndicadoresDeLotes(loteIds: number[]) {
  const [porLote, setPorLote] = useState<Map<number, IndicadoresDeLote>>(new Map())
  const [cargando, setCargando] = useState(false)
  const pedidos = useRef(new Set<number>())

  // La lista llega como arreglo nuevo en cada render; se compara por
  // contenido para no disparar el efecto en bucle.
  const clave = loteIds.slice().sort((a, b) => a - b).join(',')

  useEffect(() => {
    const ids = clave === '' ? [] : clave.split(',').map(Number)
    const pendientes = ids.filter((id) => !pedidos.current.has(id))
    if (pendientes.length === 0) return

    for (const id of pendientes) pedidos.current.add(id)

    let vigente = true
    setCargando(true)

    void Promise.all(
      pendientes.map((id) =>
        obtenerIndicadoresDeLote(id)
          .then((lista) => ({ id, lista }))
          // Un lote sin indicadores calculados todavía no es un error:
          // devuelve serie vacía y la vista lo dice.
          .catch(() => ({ id, lista: [] as DashboardIndicador[] })),
      ),
    ).then((resultados) => {
      if (!vigente) return
      setPorLote((previo) => {
        const siguiente = new Map(previo)
        for (const { id, lista } of resultados) {
          const serie = serieCronologica(lista)
          siguiente.set(id, {
            serie,
            ultimo: serie.length > 0 ? serie[serie.length - 1] : null,
          })
        }
        return siguiente
      })
      setCargando(false)
    })

    return () => {
      vigente = false
    }
  }, [clave])

  return { porLote, cargando }
}
