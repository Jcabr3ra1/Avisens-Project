import { useCallback, useState } from 'react'
import { solicitarRecuperacion } from '../api/recuperacionesPassword'

export function useSolicitudRecuperacion() {
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const enviar = useCallback(async (email: string, motivo: string) => {
    setEnviando(true)
    setMensaje('')
    setError('')

    try {
      const respuesta = await solicitarRecuperacion({
        email: email.trim(),
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
