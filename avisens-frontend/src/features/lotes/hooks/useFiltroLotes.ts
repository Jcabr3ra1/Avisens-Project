import { useMemo, useState } from 'react'
import type { Lote } from '../api/lotes'
import { filtrarLotes, type FiltroEstadoLote } from '../model/loteVista'

export function useFiltroLotes(lotes: Lote[]) {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstadoLote>('todos')
  const visibles = useMemo(
    () => filtrarLotes(lotes, busqueda, estado),
    [lotes, busqueda, estado],
  )
  return { busqueda, setBusqueda, estado, setEstado, visibles }
}
