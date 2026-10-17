import { useCallback, useEffect, useRef, useState } from 'react'
import { listarAuditoria, opcionesAuditoria } from '../api/auditoria'
import { rangoValido, type FiltrosAuditoria, type OpcionesAuditoria, type RegistroAuditoria } from '../model/auditoria'

const REGISTROS_POR_PAGINA = 20

export function useAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({})
  const [opciones, setOpciones] = useState<OpcionesAuditoria>({ acciones: [], entidades: [], usuarios: [] })
  const filtrosRef = useRef(filtros)
  const pedido = useRef(0)

  const cargar = useCallback(async (paginaPedida: number, filtrosPedidos: FiltrosAuditoria) => {
    const numero = ++pedido.current
    setCargando(true)
    setError('')
    try {
      const listado = await listarAuditoria(paginaPedida, REGISTROS_POR_PAGINA, filtrosPedidos)
      if (numero !== pedido.current) return
      setRegistros(listado.registros)
      setTotal(listado.total)
      setPagina(listado.pagina)
      setTotalPaginas(Math.max(listado.totalPaginas, 1))
    } catch {
      if (numero === pedido.current) setError('No se pudo cargar la bitácora de auditoría. Intenta de nuevo.')
    } finally {
      if (numero === pedido.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(1, {})
    opcionesAuditoria().then(setOpciones).catch(() => undefined)
  }, [cargar])

  const cambiarPagina = useCallback(
    (nueva: number) => {
      if (nueva < 1 || nueva > totalPaginas || nueva === pagina) return
      void cargar(nueva, filtrosRef.current)
    },
    [cargar, pagina, totalPaginas],
  )

  const cambiarFiltros = useCallback(
    (cambios: FiltrosAuditoria) => {
      const siguientes = { ...filtrosRef.current, ...cambios }
      filtrosRef.current = siguientes
      setFiltros(siguientes)
      if (rangoValido(siguientes)) void cargar(1, siguientes)
    },
    [cargar],
  )

  const limpiarFiltros = useCallback(() => {
    filtrosRef.current = {}
    setFiltros({})
    void cargar(1, {})
  }, [cargar])

  return {
    registros,
    pagina,
    total,
    totalPaginas,
    cargando,
    error,
    filtros,
    opciones,
    cambiarPagina,
    cambiarFiltros,
    limpiarFiltros,
    recargar: () => void cargar(pagina, filtrosRef.current),
  }
}
