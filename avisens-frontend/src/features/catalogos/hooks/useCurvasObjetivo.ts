import { useCallback, useEffect, useState } from 'react'
import {
  listarCurvasObjetivo,
  type CurvaObjetivo,
} from '@features/indicadores/api/curvas-objetivo'

export function useCurvasObjetivo() {
  const [curvas, setCurvas] = useState<CurvaObjetivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setCurvas(await listarCurvasObjetivo())
    } catch {
      setError('No se pudieron cargar las curvas objetivo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  return { curvas, cargando, error, recargar }
}
