import { useEffect, useState } from 'react'
import { obtenerProspecto, type ProspectoDetalle } from '../api/prospectos'

export function useDetalleProspecto(prospectoId: number | null, version: string) {
  const [detalle, setDetalle] = useState<ProspectoDetalle | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (prospectoId === null) {
      setDetalle(null)
      return
    }
    let vigente = true
    setCargando(true)
    void obtenerProspecto(prospectoId)
      .then((respuesta) => { if (vigente) setDetalle(respuesta) })
      .catch(() => { if (vigente) setDetalle(null) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [prospectoId, version])

  return { detalle: detalle?.id === prospectoId ? detalle : null, cargando }
}
