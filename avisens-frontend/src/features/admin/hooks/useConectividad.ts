import { useCallback, useEffect, useState } from 'react'
import { obtenerConectividad } from '../api/admin'
import type { ConectividadPlataforma } from '../model/conectividad'

export function useConectividad() {
  const [conectividad, setConectividad] = useState<ConectividadPlataforma | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setConectividad(await obtenerConectividad())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { conectividad, cargando, error, recargar }
}
