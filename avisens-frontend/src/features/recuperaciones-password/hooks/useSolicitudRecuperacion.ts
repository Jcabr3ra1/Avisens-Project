import { useCallback, useState } from 'react'
import { solicitarRecuperacion } from '../api/recuperacionesPassword'

export function useSolicitudRecuperacion() {
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const enviar = useCallback(async (username: string, motivo: string) => {
    setEnviando(true)
    setMensaje('')
    setError('')

    try {
      const respuesta = await solicitarRecuperacion({
        username: username.trim().toLowerCase(),
        motivo: motivo.trim() || undefined,
      })
      setMensaje(respuesta.mensaje)
      return true
    } catch {
      setError('No pudimos enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.')
      return false
    } finally {
      setEnviando(false)
    }
  }, [])

  return { enviando, mensaje, error, enviar }
}
