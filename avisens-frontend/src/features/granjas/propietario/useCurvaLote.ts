import { useEffect, useState } from 'react'
import { obtenerCurvaCrecimiento, type CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { interpretarErrorCurva, type ProblemaCurva } from '@features/guia-crecimiento/model/proyeccion'

type Estado = { loteId: number | null; curva: CurvaCrecimiento | null; problema: ProblemaCurva | null; cargando: boolean }

export function useCurvaLote(loteId: number | null, revision: number) {
  const [estado, setEstado] = useState<Estado>({ loteId, curva: null, problema: null, cargando: loteId !== null })

  useEffect(() => {
    if (loteId === null) return
    let vigente = true
    setEstado({ loteId, curva: null, problema: null, cargando: true })
    obtenerCurvaCrecimiento(loteId)
      .then((curva) => { if (vigente) setEstado({ loteId, curva, problema: null, cargando: false }) })
      .catch((error: unknown) => {
        if (vigente) setEstado({ loteId, curva: null, problema: interpretarErrorCurva(error), cargando: false })
      })
    return () => { vigente = false }
  }, [loteId, revision])

  return estado.loteId === loteId ? estado : { loteId, curva: null, problema: null, cargando: loteId !== null }
}
