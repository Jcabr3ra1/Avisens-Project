import { useCallback, useEffect, useState } from 'react'
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
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setSolicitudes(await listarRecuperaciones())
    } catch {
      setError('No se pudieron cargar las solicitudes. Intenta actualizar la página.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const aprobar = useCallback(async (
    id: number,
    datos: ResolverRecuperacionPayload,
  ): Promise<AprobacionRecuperacion> => {
    setError('')
    setMensaje('')
    try {
      const respuesta = await aprobarRecuperacion(id, datos)
      await cargar()
      setMensaje('El acceso temporal fue generado. Compártelo solo por un canal seguro.')
      return respuesta
    } catch {
      setError('No se pudo restablecer el acceso. Verifica que la solicitud siga pendiente.')
      throw new Error('No se pudo restablecer el acceso.')
    }
  }, [cargar])

  const rechazar = useCallback(async (
    id: number,
    datos: ResolverRecuperacionPayload,
  ) => {
    setError('')
    setMensaje('')
    try {
      await rechazarRecuperacion(id, datos)
      await cargar()
      setMensaje('La solicitud fue rechazada.')
    } catch {
      setError('No se pudo rechazar la solicitud. Inténtalo de nuevo.')
      throw new Error('No se pudo rechazar la solicitud.')
    }
  }, [cargar])

  return { solicitudes, cargando, error, mensaje, cargar, aprobar, rechazar }
}
