import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  enviarMensajeEquipo,
  eliminarMensajeEquipo,
  listarMensajesDeGalpon,
  marcarLeidosDeGalpon,
  obtenerResumenEquipo,
  type MensajeEquipo,
  type ResumenGalponEquipo,
  abrirConversacionPrivada,
  enviarMensajePrivado,
  listarContactosEquipo,
  listarConversacionesPrivadas,
  listarMensajesPrivados,
  marcarMensajesPrivadosLeidos,
  type ContactoEquipo,
  type ConversacionPrivadaEquipo,
  type MensajePrivadoEquipo,
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

  const cargar = useCallback(async (silencioso = false) => {
    if (galponId === null) {
      setMensajes([])
      setCargando(false)
      return
    }
    if (!silencioso) {
      setCargando(true)
      setError('')
    }
    try {
      // Llegan del más reciente al más antiguo; la conversación se lee al revés.
      const lista = await listarMensajesDeGalpon(galponId)
      setMensajes([...lista].reverse())
      void marcarLeidosDeGalpon(galponId).catch(() => undefined)
    } catch (err) {
      if (!silencioso) setError(mensajeDeError(err, 'No pudimos cargar la conversación de este galpón.'))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (galponId === null) return
    const intervalo = window.setInterval(() => void cargar(true), 12_000)
    return () => window.clearInterval(intervalo)
  }, [cargar, galponId])

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

export function usePrivadasEquipo(galponId: number | null) {
  const [contactos, setContactos] = useState<ContactoEquipo[]>([])
  const [conversaciones, setConversaciones] = useState<ConversacionPrivadaEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (galponId === null) {
      setContactos([])
      setConversaciones([])
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const [listaContactos, listaConversaciones] = await Promise.all([
        listarContactosEquipo(galponId),
        listarConversacionesPrivadas(galponId),
      ])
      setContactos(listaContactos)
      setConversaciones(listaConversaciones)
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos cargar los chats privados.'))
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const abrir = useCallback(async (destinatarioId: number) => {
    if (galponId === null || abriendo) return null
    setAbriendo(true)
    setError('')
    try {
      const conversacion = await abrirConversacionPrivada({ galpon_id: galponId, destinatario_id: destinatarioId })
      setConversaciones((actuales) => {
        const sinActual = actuales.filter((actual) => actual.id !== conversacion.id)
        return [conversacion, ...sinActual]
      })
      return conversacion
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos abrir el chat privado.'))
      return null
    } finally {
      setAbriendo(false)
    }
  }, [abriendo, galponId])

  return { contactos, conversaciones, cargando, abriendo, error, abrir, recargar: cargar }
}

export function useHiloPrivado(conversacionId: number | null) {
  const [mensajes, setMensajes] = useState<MensajePrivadoEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async (silencioso = false) => {
    if (conversacionId === null) {
      setMensajes([])
      setCargando(false)
      return
    }
    if (!silencioso) {
      setCargando(true)
      setError('')
    }
    try {
      const lista = await listarMensajesPrivados(conversacionId)
      setMensajes([...lista].reverse())
      void marcarMensajesPrivadosLeidos(conversacionId).catch(() => undefined)
    } catch (err) {
      if (!silencioso) setError(mensajeDeError(err, 'No pudimos cargar el chat privado.'))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [conversacionId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (conversacionId === null) return
    const intervalo = window.setInterval(() => void cargar(true), 12_000)
    return () => window.clearInterval(intervalo)
  }, [cargar, conversacionId])

  const enviar = useCallback(async (contenido: string) => {
    const texto = contenido.trim()
    if (conversacionId === null || !texto || enviando) return
    setEnviando(true)
    setError('')
    try {
      const creado = await enviarMensajePrivado(conversacionId, texto)
      setMensajes((actuales) => [...actuales, creado])
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos enviar el mensaje privado.'))
    } finally {
      setEnviando(false)
    }
  }, [conversacionId, enviando])

  return { mensajes, cargando, enviando, error, enviar, recargar: cargar }
}
