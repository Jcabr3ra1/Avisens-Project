import { useEffect, useState } from 'react'
import { listarClimaDeGranja } from '@features/clima/api/clima'
import { fraseClima } from '../model/clima'

type Estado = { granjaId: number | null; frase: string | null }

export function useClimaHoy(granjaId: number | null): string | null {
  const [estado, setEstado] = useState<Estado>({ granjaId, frase: null })

  useEffect(() => {
    if (granjaId === null) return
    let vigente = true
    listarClimaDeGranja(granjaId)
      .then((lecturas) => { if (vigente) setEstado({ granjaId, frase: fraseClima(lecturas) }) })
      .catch(() => { if (vigente) setEstado({ granjaId, frase: null }) })
    return () => { vigente = false }
  }, [granjaId])

  return estado.granjaId === granjaId ? estado.frase : null
}
