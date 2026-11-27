import { useMemo } from 'react'
import type { Lote } from '../api/lotes'
import { calcularResumenLotes } from '../model/loteVista'

export function useResumenLotes(lotes: Lote[]) {
  return useMemo(() => calcularResumenLotes(lotes), [lotes])
}
