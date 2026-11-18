import { useCallback, useEffect, useMemo, useState } from 'react'
import { listarInsumos, type Insumo } from '@features/inventario/api/insumos'
import { estadoStock, ordenarPorUrgencia } from '@features/inventario/model/inventario'

// Insumos de bodega por debajo de su mínimo. No son alertas de la tabla
// `alertas` (no se cierran ni se escalan): se resuelven reponiendo en Bodega.
// La app Android los muestra junto a las alertas y la web ahora también.
export function useStockBajo(activo: boolean) {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [cargando, setCargando] = useState(activo)

  const recargar = useCallback(async () => {
    if (!activo) return
    setCargando(true)
    try {
      setInsumos(await listarInsumos())
    } catch {
      // Si Bodega no responde, Alertas sigue funcionando: solo falta el aviso.
      setInsumos([])
    } finally {
      setCargando(false)
    }
  }, [activo])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const porReponer = useMemo(
    () => ordenarPorUrgencia(insumos.filter((insumo) => insumo.activo && estadoStock(insumo) !== 'ok')),
    [insumos],
  )

  return { porReponer, cargando, recargar }
}
