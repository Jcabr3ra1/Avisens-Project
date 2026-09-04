import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  aprobarRecuperacion,
  listarRecuperacionesDeUsuario,
  rechazarRecuperacion,
} from '../api/recuperacionesPassword'
import type {
  AprobacionRecuperacion,
  RecuperacionPassword,
  ResolverRecuperacionPayload,
} from '../model/recuperacionPassword'

export function useRecuperacionesDeUsuario(usuarioId: number) {
  const [solicitudes, setSolicitudes] = useState<RecuperacionPassword[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setSolicitudes(await listarRecuperacionesDeUsuario(usuarioId))
    } catch {
      setError('No se pudieron cargar las solicitudes de recuperación.')
    } finally {
      setCargando(false)
    }
  }, [usuarioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const aprobar = useCallback(
    async (
      id: number,
      datos: ResolverRecuperacionPayload,
    ): Promise<AprobacionRecuperacion> => {
      const respuesta = await aprobarRecuperacion(id, datos)
      toast.success('Acceso temporal generado', {
        description: 'Muéstralo una sola vez y compártelo por un canal seguro.',
      })
      await cargar()
      return respuesta
    },
    [cargar],
  )

  const rechazar = useCallback(
    async (id: number, datos: ResolverRecuperacionPayload) => {
      await rechazarRecuperacion(id, datos)
      toast.success('Solicitud rechazada')
      await cargar()
    },
    [cargar],
  )

  return { solicitudes, cargando, error, aprobar, rechazar }
}
