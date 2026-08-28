import { useCallback, useEffect, useRef, useState } from 'react'
import { listarProspectos } from '../api/prospectos'
import { aProspectoVista, type ProspectoVista } from '../model/prospectoVista'

const POR_PAGINA = 100

export function useProspectos() {
  const [prospectos, setProspectos] = useState<ProspectoVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const { data } = await listarProspectos({ limit: POR_PAGINA })
      if (montado.current) setProspectos(data.map(aProspectoVista))
    } catch {
      if (montado.current) setError('No se pudieron cargar los prospectos.')
    } finally {
      if (montado.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { prospectos, cargando, error, recargar: cargar }
}
