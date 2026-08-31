import { useCallback, useEffect, useRef, useState } from 'react'
import { interpretarComando } from '@features/comandos-voz/api/comandos-voz'
import { obtenerReconocimiento, type Reconocimiento } from '../model/reconocimientoVoz'

export function useComandoVoz(galponId: number | null) {
  const [comando, setComando] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState('')
  const reconocimiento = useRef<Reconocimiento | null>(null)

  // Si el panel se cierra mientras el micrófono sigue abierto, el navegador
  // lo deja escuchando: hay que abortarlo al desmontar.
  useEffect(() => {
    return () => {
      reconocimiento.current?.abort()
    }
  }, [])

  const dictar = useCallback(() => {
    const Constructor = obtenerReconocimiento()
    if (!Constructor) {
      setError('Tu navegador no permite dictado por voz. Puedes escribir el comando.')
      return
    }

    reconocimiento.current?.abort()
    const sesion = new Constructor()
    sesion.lang = 'es-CO'
    sesion.interimResults = false
    sesion.continuous = false
    sesion.onresult = (evento) => {
      setComando(evento.results[evento.resultIndex][0]?.transcript ?? '')
    }
    sesion.onerror = () =>
      setError('No pudimos escuchar el comando. Puedes intentarlo de nuevo o escribirlo.')
    sesion.onend = () => setEscuchando(false)

    reconocimiento.current = sesion
    setError('')
    setEscuchando(true)
    sesion.start()
  }, [])

  const enviar = useCallback(async () => {
    if (!galponId || !comando.trim() || enviando) return
    setEnviando(true)
    setError('')
    setRespuesta('')
    try {
      const resultado = await interpretarComando({
        galpon_id: galponId,
        comando_texto: comando.trim(),
      })
      setRespuesta(resultado.mensaje ?? 'El comando fue registrado.')
    } catch {
      setError('No pudimos procesar el comando. Revisa el galpón seleccionado e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }, [comando, enviando, galponId])

  return { comando, setComando, escuchando, enviando, respuesta, error, dictar, enviar }
}
