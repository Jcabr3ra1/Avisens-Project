import { useCallback, useEffect, useState } from 'react'
import {
  obtenerCurvaCrecimiento, predecirLote,
  type CurvaCrecimiento, type ResultadoPrediccion,
} from '@features/predicciones/api/predicciones'
import { mensajeDeError } from '@shared/utils/errores'
import { interpretarErrorCurva, type ProblemaCurva } from '../model/proyeccion'

type EstadoProyeccion = {
  clave: string
  curva: CurvaCrecimiento | null
  problemaCurva: ProblemaCurva | null
  cargandoCurva: boolean
  prediccion: ResultadoPrediccion | null
  errorPrediccion: string
  cargandoPrediccion: boolean
}

function vacio(clave: string, cargando: boolean): EstadoProyeccion {
  return {
    clave, curva: null, problemaCurva: null, cargandoCurva: cargando,
    prediccion: null, errorPrediccion: '', cargandoPrediccion: cargando,
  }
}

export function useProyeccionLote(loteId: number | null, habilitado: boolean, revisionPlan: string) {
  const [revision, setRevision] = useState(0)
  const clave = `${loteId ?? ''}|${habilitado}|${revisionPlan}|${revision}`
  const activo = loteId !== null && habilitado
  const [estado, setEstado] = useState(() => vacio(clave, activo))

  useEffect(() => {
    if (loteId === null || !habilitado) return
    let vigente = true
    const aplicar = (datos: Partial<EstadoProyeccion>) => {
      if (vigente) setEstado((anterior) => anterior.clave === clave ? { ...anterior, ...datos } : anterior)
    }
    setEstado(vacio(clave, true))

    obtenerCurvaCrecimiento(loteId)
      .then((curva) => aplicar({ curva, cargandoCurva: false }))
      .catch((error: unknown) => aplicar({ problemaCurva: interpretarErrorCurva(error), cargandoCurva: false }))

    predecirLote(loteId)
      .then((prediccion) => aplicar({ prediccion, cargandoPrediccion: false }))
      .catch((error: unknown) => aplicar({
        errorPrediccion: mensajeDeError(error, 'No se pudo proyectar el lote al día de faena.'),
        cargandoPrediccion: false,
      }))

    return () => { vigente = false }
  }, [clave, loteId, habilitado])

  const recargar = useCallback(() => setRevision((valor) => valor + 1), [])
  const vista = estado.clave === clave ? estado : vacio(clave, activo)
  return { ...vista, recargar }
}
