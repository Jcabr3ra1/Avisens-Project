import { useEffect, useState } from 'react'
import { listarClimaDeGranja } from '@features/clima/api/clima'
import { climaVisual, type ClimaVisual } from './climaVisual'

type Estado = { granjaId: number | null; clima: ClimaVisual }

export function useClimaVisual(granjaId: number | null): ClimaVisual {
  const [estado, setEstado] = useState<Estado>({ granjaId, clima: 'despejado' })

  useEffect(() => {
    if (granjaId === null) return
    let vigente = true
    listarClimaDeGranja(granjaId)
      .then((lecturas) => { if (vigente) setEstado({ granjaId, clima: climaVisual(lecturas) }) })
      .catch(() => { if (vigente) setEstado({ granjaId, clima: 'despejado' }) })
    return () => { vigente = false }
  }, [granjaId])

  return estado.granjaId === granjaId ? estado.clima : 'despejado'
}
