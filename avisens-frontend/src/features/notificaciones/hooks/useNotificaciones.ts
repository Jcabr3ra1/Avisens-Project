import { useCallback, useEffect, useRef, useState } from 'react'
import {
  contarNotificacionesNoLeidas,
  eliminarNotificacion,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  type Notificacion,
} from '@shared/api'

const INTERVALO_SONDEO_MS = 30_000

export function useConteoNotificaciones() {
  const [noLeidas, setNoLeidas] = useState(0)
  const activo = useRef(true)

  const actualizar = useCallback(async () => {
    try {
      setNoLeidas(await contarNotificacionesNoLeidas())
    } catch {
      setNoLeidas(0)
    }
  }, [])

  useEffect(() => {
    activo.current = true
    void actualizar()
    const id = window.setInterval(() => {
      if (!document.hidden) void actualizar()
    }, INTERVALO_SONDEO_MS)
    return () => {
      activo.current = false
      window.clearInterval(id)
    }
  }, [actualizar])

  return { noLeidas, actualizarConteo: actualizar }
}

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const { noLeidas, actualizarConteo } = useConteoNotificaciones()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setNotificaciones(await listarNotificaciones())
      await actualizarConteo()
    } catch {
      setError('No se pudieron cargar las notificaciones. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [actualizarConteo])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const marcarLeida = useCallback(async (id: number) => {
    try {
      await marcarNotificacionLeida(id)
      setNotificaciones((prev) =>
        prev.map((notificacion) =>
          notificacion.id === id ? { ...notificacion, leida: true } : notificacion,
        ),
      )
      await actualizarConteo()
    } catch {
      setError('No se pudo marcar la notificación como leída.')
    }
  }, [actualizarConteo])

  const marcarTodas = useCallback(async () => {
    try {
      await marcarTodasLeidas()
      setNotificaciones((prev) =>
        prev.map((notificacion) => ({ ...notificacion, leida: true })),
      )
      await actualizarConteo()
    } catch {
      setError('No se pudieron marcar todas como leídas.')
    }
  }, [actualizarConteo])

  const eliminar = useCallback(async (id: number) => {
    try {
      await eliminarNotificacion(id)
      setNotificaciones((prev) => prev.filter((notificacion) => notificacion.id !== id))
      await actualizarConteo()
    } catch {
      setError('No se pudo eliminar la notificación.')
    }
  }, [actualizarConteo])

  return {
    notificaciones,
    noLeidas,
    cargando,
    error,
    cargar,
    marcarLeida,
    marcarTodas,
    eliminar,
  }
}
