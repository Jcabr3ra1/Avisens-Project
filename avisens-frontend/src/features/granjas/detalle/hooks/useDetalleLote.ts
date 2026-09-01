import { useEffect, useState } from 'react'
import { listarConsumosDiarios } from '@features/consumos-diarios/api/consumosDiarios'
import type { ConsumoDiario } from '@features/consumos-diarios/model/consumoDiario'
import { obtenerIndicadoresDeLote } from '@features/dashboard/api/dashboard'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { serieCronologica } from '../model/granjaDetalle'

export type DetalleLote = {
  // Serie completa, del día más viejo al más reciente: es lo que dibujan
  // las gráficas de evolución.
  serie: DashboardIndicador[]
  // El corte más reciente, para los números grandes.
  ultimo: DashboardIndicador | null
  alimentoKg: number
  aguaLitros: number
  cargando: boolean
}

const VACIO: DetalleLote = {
  serie: [],
  ultimo: null,
  alimentoKg: 0,
  aguaLitros: 0,
  cargando: false,
}

export function useDetalleLote(loteId: number | null): DetalleLote {
  const [detalle, setDetalle] = useState<DetalleLote>(VACIO)

  useEffect(() => {
    if (loteId === null) {
      setDetalle(VACIO)
      return
    }

    let vigente = true
    setDetalle({ ...VACIO, cargando: true })

    // Los indicadores pueden no existir todavía (sin curva sembrada, o lote
    // recién creado). Eso no es un error: la vista lo dice y sigue.
    const indicadores = obtenerIndicadoresDeLote(loteId).catch(
      () => [] as DashboardIndicador[],
    )
    const consumos = listarConsumosDiarios().catch(() => [] as ConsumoDiario[])

    void Promise.all([indicadores, consumos]).then(([lista, todosLosConsumos]) => {
      if (!vigente) return
      const delLote = todosLosConsumos.filter((consumo) => consumo.lote_id === loteId)
      const serie = serieCronologica(lista)
      setDetalle({
        serie,
        ultimo: serie.length > 0 ? serie[serie.length - 1] : null,
        alimentoKg: delLote.reduce((total, c) => total + (c.alimento_kg ?? 0), 0),
        aguaLitros: delLote.reduce((total, c) => total + (c.agua_litros ?? 0), 0),
        cargando: false,
      })
    })

    return () => {
      vigente = false
    }
  }, [loteId])

  return detalle
}
