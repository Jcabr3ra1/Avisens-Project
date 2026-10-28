import { useEffect, useState } from 'react'
import { faseDelDia, type FaseDelDia } from '../model/escenaGalpon'

const MINUTOS_ENTRE_RELOJES = 5

function horaActual(): number {
  const ahora = new Date()
  return ahora.getHours() + ahora.getMinutes() / 60
}

export function useHoraDelDia(): number {
  const [hora, setHora] = useState(horaActual)
  useEffect(() => {
    const reloj = window.setInterval(() => setHora(horaActual()), MINUTOS_ENTRE_RELOJES * 60_000)
    return () => window.clearInterval(reloj)
  }, [])
  return hora
}

export function useFaseDelDia(): FaseDelDia {
  return faseDelDia(useHoraDelDia())
}
