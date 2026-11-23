import { useEffect, useState } from 'react'

export function useAhora(cadaMs = 60_000): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), cadaMs)
    return () => window.clearInterval(reloj)
  }, [cadaMs])
  return ahora
}
