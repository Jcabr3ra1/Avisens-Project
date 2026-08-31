import { useCallback, useState } from 'react'
import { preguntarAlCopiloto } from '@features/copiloto/api/copiloto'
import {
  idMensajeCopiloto,
  idMensajeUsuario,
  type MensajeCopiloto,
} from '../model/comunicacion'

export function useCopiloto() {
  // La conversación se encadena: el backend devuelve un id y hay que
  // reenviarlo para que Lía recuerde lo anterior.
  const [conversacionId, setConversacionId] = useState<number | undefined>()
  const [mensajes, setMensajes] = useState<MensajeCopiloto[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const preguntar = useCallback(
    async (pregunta: string) => {
      const texto = pregunta.trim()
      if (!texto || enviando) return

      setMensajes((actuales) => [
        ...actuales,
        { id: idMensajeUsuario(), autor: 'usuario', contenido: texto },
      ])
      setEnviando(true)
      setError('')

      try {
        const respuesta = await preguntarAlCopiloto({
          pregunta: texto,
          conversacion_id: conversacionId,
        })
        setConversacionId(respuesta.conversacion_id)
        setMensajes((actuales) => [
          ...actuales,
          {
            id: idMensajeCopiloto(respuesta.conversacion_id),
            autor: 'lia',
            contenido: respuesta.respuesta,
          },
        ])
      } catch {
        setError('No pudimos consultar a Lía. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        setEnviando(false)
      }
    },
    [conversacionId, enviando],
  )

  return { mensajes, enviando, error, preguntar }
}
