import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  enviarMensajeEquipo,
  eliminarMensajeEquipo,
  listarMensajesDeGalpon,
  marcarLeidosDeGalpon,
  obtenerResumenEquipo,
  type MensajeEquipo,
  type ResumenGalponEquipo,
} from '../api/mensajesEquipo'

export function useResumenEquipo(activo: boolean) {
  const [resumen, setResumen] = useState<ResumenGalponEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      setResumen(await obtenerResumenEquipo())
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos cargar las conversaciones del equipo.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!activo) return
    void cargar()
  }, [activo, cargar])

  return { resumen, cargando, error, recargar: cargar }
}

export function useHiloEquipo(galponId: number | null) {
  const [mensajes, setMensajes] = useState<MensajeEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const marcado = useRef<number | null>(null)

  const cargar = useCallback(async () => {
    if (galponId === null) {
      setMensajes([])
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      // Llegan del más reciente al más antiguo; la conversación se lee al revés.
      const lista = await listarMensajesDeGalpon(galponId)
      setMensajes([...lista].reverse())
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos cargar la conversación de este galpón.'))
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Marcar leídos una sola vez por galpón: repetirlo en cada render dispararía
  // un PATCH por cada mensaje que llegue.
  useEffect(() => {
    if (galponId === null || cargando || marcado.current === galponId) return
    marcado.current = galponId
    void marcarLeidosDeGalpon(galponId).catch(() => undefined)
  }, [galponId, cargando])

  const enviar = useCallback(
    async (contenido: string) => {
      const texto = contenido.trim()
      if (galponId === null || !texto || enviando) return
      setEnviando(true)
      setError('')
      try {
        const creado = await enviarMensajeEquipo({ galpon_id: galponId, contenido: texto })
        setMensajes((actuales) => [...actuales, creado])
      } catch (err) {
        setError(mensajeDeError(err, 'No pudimos enviar el mensaje.'))
      } finally {
        setEnviando(false)
      }
    },
    [galponId, enviando],
  )

  const eliminar = useCallback(async (id: number) => {
    setError('')
    try {
      await eliminarMensajeEquipo(id)
      setMensajes((actuales) => actuales.filter((mensaje) => mensaje.id !== id))
    } catch (err) {
      setError(mensajeDeError(err, 'Solo puedes borrar tus propios mensajes.'))
    }
  }, [])

  return { mensajes, cargando, enviando, error, enviar, eliminar, recargar: cargar }
}
