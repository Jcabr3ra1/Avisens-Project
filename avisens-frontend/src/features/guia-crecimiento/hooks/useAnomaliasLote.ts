import { useCallback, useEffect, useState } from 'react'
import { obtenerAnomalias, type AnomaliasLote } from '@features/predicciones/api/predicciones'
import { mensajeDeError } from '@shared/utils/errores'

type EstadoAnomalias = {
  clave: string
  datos: AnomaliasLote | null
  error: string
  cargando: boolean
}

function vacio(clave: string, cargando: boolean): EstadoAnomalias {
  return { clave, datos: null, error: '', cargando }
}

export function useAnomaliasLote(loteId: number | null, habilitado: boolean) {
  const [revision, setRevision] = useState(0)
  const clave = `${loteId ?? ''}|${habilitado}|${revision}`
  const activo = loteId !== null && habilitado
  const [estado, setEstado] = useState(() => vacio(clave, activo))

  useEffect(() => {
    if (loteId === null || !habilitado) return
    let vigente = true
    const aplicar = (datos: Partial<EstadoAnomalias>) => {
      if (vigente) setEstado((anterior) => anterior.clave === clave ? { ...anterior, ...datos } : anterior)
    }
    setEstado(vacio(clave, true))

    obtenerAnomalias(loteId)
      .then((datos) => aplicar({ datos, cargando: false }))
      .catch((error: unknown) => aplicar({
        error: mensajeDeError(error, 'No se pudieron revisar las alertas del lote.'),
        cargando: false,
      }))

    return () => { vigente = false }
  }, [clave, loteId, habilitado])

  const recargar = useCallback(() => setRevision((valor) => valor + 1), [])
  const vista = estado.clave === clave ? estado : vacio(clave, activo)
  return { ...vista, recargar }
}
