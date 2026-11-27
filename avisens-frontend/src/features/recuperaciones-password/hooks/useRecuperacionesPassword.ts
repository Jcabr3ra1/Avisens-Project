import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import {
  aprobarRecuperacion,
  listarRecuperaciones,
  rechazarRecuperacion,
} from '../api/recuperacionesPassword'
import type {
  AprobacionRecuperacion,
  RecuperacionPassword,
  ResolverRecuperacionPayload,
} from '../model/recuperacionPassword'

export function useRecuperacionesPassword() {
  const [solicitudes, setSolicitudes] = useState<RecuperacionPassword[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError('')
    try {
      setSolicitudes(await listarRecuperaciones())
    } catch {
      if (!silencioso) setError('No se pudieron cargar las solicitudes. Intenta de nuevo.')
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useRefetchOnFocus(() => {
    void cargar(true)
  })

  const aprobar = useCallback(async (
    id: number,
    datos: ResolverRecuperacionPayload,
  ): Promise<AprobacionRecuperacion> => {
    try {
      const respuesta = await aprobarRecuperacion(id, datos)
      await cargar(true)
      toast.success('Acceso temporal generado', {
        description: 'Muéstralo una sola vez y compártelo por un canal seguro.',
      })
      return respuesta
    } catch {
      toast.error('No se pudo restablecer el acceso', {
        description: 'Verifica que la solicitud siga pendiente.',
      })
      throw new Error('No se pudo restablecer el acceso.')
    }
  }, [cargar])

  const rechazar = useCallback(async (
    id: number,
    datos: ResolverRecuperacionPayload,
  ) => {
    try {
      await rechazarRecuperacion(id, datos)
      await cargar(true)
      toast.success('Solicitud rechazada')
    } catch {
      toast.error('No se pudo rechazar la solicitud', {
        description: 'Inténtalo de nuevo en unos segundos.',
      })
      throw new Error('No se pudo rechazar la solicitud.')
    }
  }, [cargar])

  return { solicitudes, cargando, error, cargar, aprobar, rechazar }
}
