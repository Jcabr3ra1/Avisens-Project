import { useCallback, useEffect, useState } from 'react'
import {
  listarSolicitudesPqrsDeProspecto,
  responderSolicitudPqrs,
} from '../api/solicitudesPqrs'
import type {
  EstadoSolicitudPqrs,
  SolicitudPqrs,
} from '../model/solicitudPqrs'

export function useSolicitudesDeProspecto(prospectoId: number) {
  const [solicitudes, setSolicitudes] = useState<SolicitudPqrs[]>([])
  const [cargando, setCargando] = useState(false)
  const [atendiendo, setAtendiendo] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setSolicitudes(await listarSolicitudesPqrsDeProspecto(prospectoId))
    } catch {
      setError('No se pudieron cargar las solicitudes del prospecto.')
    } finally {
      setCargando(false)
    }
  }, [prospectoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const atender = useCallback(
    async (
      id: number,
      estado: Exclude<EstadoSolicitudPqrs, 'abierta'>,
    ): Promise<boolean> => {
      setAtendiendo(true)
      setError('')
      try {
        const actualizada = await responderSolicitudPqrs(id, { estado })
        setSolicitudes((actuales) =>
          actuales.map((solicitud) =>
            solicitud.id === id ? actualizada : solicitud,
          ),
        )
        return true
      } catch {
        setError('No se pudo actualizar la solicitud.')
        return false
      } finally {
        setAtendiendo(false)
      }
    },
    [],
  )

  return { solicitudes, cargando, atendiendo, error, atender, recargar: cargar }
}
