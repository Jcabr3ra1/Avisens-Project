import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  aceptarAlerta as aceptarAlertaApi,
  cerrarAlerta as cerrarAlertaApi,
  listarAlertas,
  type Alerta,
} from '../api/alertas'

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      const respuesta = await listarAlertas()
      setAlertas(respuesta.sort((a, b) => {
        if (a.estado === 'cerrada' && b.estado !== 'cerrada') return 1
        if (a.estado !== 'cerrada' && b.estado === 'cerrada') return -1
        return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
      }))
      setError('')
    } catch {
      setError('No fue posible cargar las alertas. Revisa tu conexión e inténtalo otra vez.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const aceptar = useCallback(async (id: number) => {
    setActualizandoId(id)
    try {
      await aceptarAlertaApi(id)
      toast.success('Alerta tomada para atención')
      await recargar()
      return true
    } catch {
      toast.error('No se pudo tomar la alerta')
      return false
    } finally {
      setActualizandoId(null)
    }
  }, [recargar])

  const cerrar = useCallback(async (id: number, accion: string) => {
    setActualizandoId(id)
    try {
      const alerta = await cerrarAlertaApi(id, accion)
      toast.success('Alerta cerrada y registrada en el historial')
      await recargar()
      return alerta
    } catch {
      toast.error('No se pudo cerrar la alerta')
      return null
    } finally {
      setActualizandoId(null)
    }
  }, [recargar])

  return { alertas, cargando, actualizandoId, error, recargar, aceptar, cerrar }
}
