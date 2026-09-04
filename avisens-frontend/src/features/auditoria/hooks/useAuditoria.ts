import { useCallback, useEffect, useState } from 'react'
import { listarAuditoria } from '../api/auditoria'
import type { RegistroAuditoria } from '../model/auditoria'

const REGISTROS_POR_PAGINA = 20

export function useAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (paginaPedida: number) => {
    setCargando(true)
    setError('')
    try {
      const listado = await listarAuditoria(paginaPedida, REGISTROS_POR_PAGINA)
      setRegistros(listado.registros)
      setTotal(listado.total)
      setPagina(listado.pagina)
      setTotalPaginas(Math.max(listado.totalPaginas, 1))
    } catch {
      setError('No se pudo cargar la bitácora de auditoría. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(1)
  }, [cargar])

  const cambiarPagina = useCallback(
    (nueva: number) => {
      if (nueva < 1 || nueva > totalPaginas || nueva === pagina) return
      void cargar(nueva)
    },
    [cargar, pagina, totalPaginas],
  )

  return {
    registros,
    pagina,
    total,
    totalPaginas,
    cargando,
    error,
    cambiarPagina,
    recargar: () => void cargar(pagina),
  }
}
