import { useCallback, useEffect, useState } from 'react'
import { listarMovimientosInsumo } from '../api/insumos'
import type { MovimientoInventario } from '../api/movimientos'

// El historial se pide solo cuando el insumo se despliega, y se recuerda:
// abrir y cerrar la misma tarjeta no vuelve a pedirlo. `recargarSi` sirve
// para refrescarlo tras registrar un movimiento nuevo.
export function useMovimientosInsumo(insumoId: number | null) {
  const [porInsumo, setPorInsumo] = useState<Map<number, MovimientoInventario[]>>(new Map())
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (id: number) => {
    setCargando(true)
    try {
      const movimientos = await listarMovimientosInsumo(id)
      setPorInsumo((previo) => new Map(previo).set(id, movimientos))
    } catch {
      setPorInsumo((previo) => new Map(previo).set(id, []))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (insumoId === null || porInsumo.has(insumoId)) return
    void cargar(insumoId)
  }, [insumoId, porInsumo, cargar])

  const refrescar = useCallback(
    async (id: number) => {
      await cargar(id)
    },
    [cargar],
  )

  return { porInsumo, cargando, refrescar }
}
