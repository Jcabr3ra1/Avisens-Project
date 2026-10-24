import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 900

function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function useConteo(objetivo: number | null): number | null {
  const [reducido] = useState(prefiereMenosMovimiento)
  const [valor, setValor] = useState(0)
  const actual = useRef(0)

  useEffect(() => {
    if (objetivo === null || reducido) return
    const origen = actual.current
    const inicio = performance.now()
    let cuadro = 0
    const avanzar = (ahora: number) => {
      const progreso = Math.min(1, (ahora - inicio) / DURACION_MS)
      const suavizado = 1 - Math.pow(1 - progreso, 4)
      actual.current = Math.round(origen + (objetivo - origen) * suavizado)
      setValor(actual.current)
      if (progreso < 1) cuadro = requestAnimationFrame(avanzar)
    }
    cuadro = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(cuadro)
  }, [objetivo, reducido])

  if (objetivo === null) return null
  return reducido ? objetivo : valor
}
