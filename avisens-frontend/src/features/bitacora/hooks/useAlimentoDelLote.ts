import { useEffect, useState } from 'react'
import { obtenerEstimacionAlimento } from '@features/lotes/api/plan-alimento'
import { mensajeDeError } from '@shared/utils/errores'
import { resumirAlimentoParaPesaje, type ResumenAlimentoPesaje } from '../model/alimentoPesaje'

type Estado = {
  resumen: ResumenAlimentoPesaje | null
  cargando: boolean
  error: string
}

// Estimación de alimento del lote (GET /lotes/:id/plan/alimento) para
// mostrarla junto al formulario de pesaje. Con loteId null no consulta nada.
export function useAlimentoDelLote(loteId: number | null): Estado {
  const [estado, setEstado] = useState<Estado>({ resumen: null, cargando: false, error: '' })

  useEffect(() => {
    if (loteId === null) return
    let vigente = true
    setEstado({ resumen: null, cargando: true, error: '' })
    obtenerEstimacionAlimento(loteId)
      .then((estimacion) => {
        if (vigente) setEstado({ resumen: resumirAlimentoParaPesaje(estimacion), cargando: false, error: '' })
      })
      .catch((error) => {
        if (vigente) {
          setEstado({
            resumen: null,
            cargando: false,
            error: mensajeDeError(error, 'No se pudo consultar el alimento estimado del lote.'),
          })
        }
      })
    return () => {
      vigente = false
    }
  }, [loteId])

  return estado
}
