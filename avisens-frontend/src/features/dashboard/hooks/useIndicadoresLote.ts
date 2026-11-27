import { useCallback, useEffect, useState } from 'react'
import { calcularIndicadores, compararConCurva, type ComparacionIndicador } from '@features/indicadores/api/indicadores'
import { obtenerIndicadoresDeLote } from '../api/dashboard'
import type { DashboardIndicador } from '../model/dashboard'

// Una sola fuente para todo lo que necesita el lote: la franja de atención y
// la tarjeta de estado leían lo mismo por separado y duplicaban las llamadas.
export function useIndicadoresLote(loteId: number | null) {
  const [indicadores, setIndicadores] = useState<DashboardIndicador[]>([])
  const [comparacion, setComparacion] = useState<ComparacionIndicador | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    if (loteId === null) {
      setIndicadores([])
      setComparacion(null)
      setCargando(false)
      return
    }

    setCargando(true)

    // Sincroniza y calcula los indicadores del día con los datos más recientes de bitácora
    await calcularIndicadores(loteId).catch(() => null)

    try {
      const [lista, datosComparacion] = await Promise.all([
        obtenerIndicadoresDeLote(loteId),
        compararConCurva(loteId).catch(() => null),
      ])
      setIndicadores(lista)
      setComparacion(datosComparacion)
    } catch {
      setIndicadores([])
      setComparacion(null)
    } finally {
      setCargando(false)
    }
  }, [loteId])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { indicadores, comparacion, cargando, recargar }
}
