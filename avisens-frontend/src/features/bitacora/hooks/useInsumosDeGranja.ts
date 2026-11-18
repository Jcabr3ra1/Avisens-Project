import { useEffect, useMemo, useState } from 'react'
import { listarInsumos, type Insumo } from '@features/inventario/api/insumos'

// Insumos activos de la granja del lote, para indicar qué vacuna o medicamento
// de bodega se aplicó en un evento sanitario. El backend rechaza un insumo de
// otra granja o inactivo, así que aquí solo se ofrecen los válidos. Se pide
// una sola vez y solo cuando se abre el formulario de sanidad.
export function useInsumosDeGranja(granjaId: number | null, activo: boolean) {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [pedido, setPedido] = useState(false)

  useEffect(() => {
    if (!activo || pedido) return
    setPedido(true)
    void listarInsumos()
      .then(setInsumos)
      .catch(() => setInsumos([]))
  }, [activo, pedido])

  return useMemo(
    () => insumos
      .filter((insumo) => insumo.activo && insumo.granja_id === granjaId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [insumos, granjaId],
  )
}
