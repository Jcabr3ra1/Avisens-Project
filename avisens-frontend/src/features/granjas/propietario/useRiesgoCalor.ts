import { useEffect, useState } from 'react'
import { obtenerRiesgoCalor, type RiesgoCalor } from '@features/predicciones/api/predicciones'
import { interpretarErrorRiesgo, type ProblemaRiesgo } from '@features/predicciones/model/riesgoCalor'

type Estado = { clave: string; riesgo: RiesgoCalor | null; problema: ProblemaRiesgo | null; cargando: boolean }

export function useRiesgoCalor(galponId: number, revision: number) {
  const clave = `${galponId}-${revision}`
  const [estado, setEstado] = useState<Estado>({ clave, riesgo: null, problema: null, cargando: true })

  useEffect(() => {
    let vigente = true
    setEstado({ clave, riesgo: null, problema: null, cargando: true })
    obtenerRiesgoCalor(galponId)
      .then((riesgo) => { if (vigente) setEstado({ clave, riesgo, problema: null, cargando: false }) })
      .catch((error: unknown) => {
        if (vigente) setEstado({ clave, riesgo: null, problema: interpretarErrorRiesgo(error), cargando: false })
      })
    return () => { vigente = false }
  }, [clave, galponId])

  return estado.clave === clave ? estado : { clave, riesgo: null, problema: null, cargando: true }
}
