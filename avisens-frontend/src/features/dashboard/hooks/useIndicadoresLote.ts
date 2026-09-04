import { useEffect, useState } from 'react'
import { compararConCurva, type ComparacionIndicador } from '@features/indicadores/api/indicadores'
import { obtenerIndicadoresDeLote } from '../api/dashboard'
import type { DashboardIndicador } from '../model/dashboard'

// Una sola fuente para todo lo que necesita el lote: la franja de atención y
// la tarjeta de estado leían lo mismo por separado y duplicaban las llamadas.
export function useIndicadoresLote(loteId: number | null) {
  const [indicadores, setIndicadores] = useState<DashboardIndicador[]>([])
  const [comparacion, setComparacion] = useState<ComparacionIndicador | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (loteId === null) {
      setIndicadores([])
      setComparacion(null)
      setCargando(false)
      return
    }

    let vigente = true
    setCargando(true)

    void obtenerIndicadoresDeLote(loteId)
      .then((lista) => { if (vigente) setIndicadores(lista) })
      .catch(() => { if (vigente) setIndicadores([]) })
      .finally(() => { if (vigente) setCargando(false) })

    // Sin curva objetivo sembrada el backend no puede comparar. Se queda en
    // null y la vista lo dice, en vez de mostrar un 0 % que parecería la meta.
    void compararConCurva(loteId)
      .then((datos) => { if (vigente) setComparacion(datos) })
      .catch(() => { if (vigente) setComparacion(null) })

    return () => { vigente = false }
  }, [loteId])

  return { indicadores, comparacion, cargando }
}
