import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  listarTodasLasSolicitudesPqrs,
  responderSolicitudPqrs,
  tomarSolicitudPqrs,
} from '../api/solicitudesPqrs'
import type { ResponderSolicitudPqrsDto, SolicitudPqrs } from '../model/solicitudPqrs'

export function useSolicitudesPqrs() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPqrs[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ocupadaId, setOcupadaId] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setSolicitudes(await listarTodasLasSolicitudesPqrs())
    } catch {
      setError('No se pudieron cargar las solicitudes.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const reemplazar = useCallback((actualizada: SolicitudPqrs) => {
    setSolicitudes((actuales) => actuales.map((solicitud) => (solicitud.id === actualizada.id ? actualizada : solicitud)))
  }, [])

  const ejecutar = useCallback(
    async (id: number, accion: () => Promise<SolicitudPqrs>, exito: string, fallo: string): Promise<boolean> => {
      setOcupadaId(id)
      try {
        reemplazar(await accion())
        toast.success(exito)
        return true
      } catch (causa) {
        toast.error(mensajeDeError(causa, fallo))
        return false
      } finally {
        setOcupadaId(null)
      }
    },
    [reemplazar],
  )

  const tomar = useCallback(
    (id: number) => ejecutar(id, () => tomarSolicitudPqrs(id), 'El caso quedó a tu cargo.', 'No se pudo tomar el caso.'),
    [ejecutar],
  )

  const responder = useCallback(
    (id: number, datos: ResponderSolicitudPqrsDto, exito: string) =>
      ejecutar(id, () => responderSolicitudPqrs(id, datos), exito, 'No se pudo guardar la solicitud.'),
    [ejecutar],
  )

  return { solicitudes, cargando, error, ocupadaId, recargar: cargar, tomar, responder }
}
