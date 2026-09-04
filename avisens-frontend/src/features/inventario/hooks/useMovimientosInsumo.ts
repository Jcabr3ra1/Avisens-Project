import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
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
    } catch (error) {
      // Dejar la lista vacía se leía como "este insumo no tiene
      // movimientos", que es justo la confusión que perseguimos.
      toast.error(mensajeDeError(error, 'No se pudo cargar el historial del insumo.'))
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
