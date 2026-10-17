import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 950

function NumeroAnimado({ valor, retrasoMs = 0 }: { valor: number; retrasoMs?: number }) {
  const [mostrado, setMostrado] = useState(0)
  const desdeRef = useRef(0)

  useEffect(() => {
    const desde = desdeRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || desde === valor) {
      desdeRef.current = valor
      setMostrado(valor)
      return
    }
    let marco = 0
    let inicio: number | null = null
    const avanzar = (ahora: number) => {
      inicio ??= ahora + retrasoMs
      const progreso = Math.min(Math.max((ahora - inicio) / DURACION_MS, 0), 1)
      const actual = Math.round(desde + (valor - desde) * (1 - (1 - progreso) ** 4))
      desdeRef.current = actual
      setMostrado(actual)
      if (progreso < 1) marco = requestAnimationFrame(avanzar)
    }
    marco = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(marco)
  }, [valor, retrasoMs])

  return (
    <>
      <span className="sr-only">{valor.toLocaleString('es-CO')}</span>
      <span aria-hidden="true">{mostrado.toLocaleString('es-CO')}</span>
    </>
  )
}

export default NumeroAnimado
