import { useCallback, useEffect, useRef, useState } from 'react'
import { obtenerMetricasAdmin } from '../api/admin'
import type { MetricasAdmin, PeriodoDias } from '../model/metricas'

export function useMetricasAdmin(dias: PeriodoDias) {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const peticion = useRef(0)

  const recargar = useCallback(async () => {
    const actual = ++peticion.current
    setCargando(true)
    try {
      const datos = await obtenerMetricasAdmin(dias)
      if (actual !== peticion.current) return
      setMetricas(datos)
      setError(false)
    } catch {
      if (actual !== peticion.current) return
      setError(true)
    } finally {
      if (actual === peticion.current) setCargando(false)
    }
  }, [dias])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const vigente = metricas !== null && metricas.dias === dias ? metricas : null

  return { metricas: vigente, cargando: cargando && vigente === null, actualizando: cargando, error: error && vigente === null, recargar }
}
