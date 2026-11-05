import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { IcArrowDown, IcArrowUp, IcCheck } from '@shared/ui/icons/icons'
import { textoDesvio, tonoDesvio } from '../model/proyeccion'

export function ChipDesvio({ pct, referencia }: { pct: number; referencia: string }) {
  const tono = tonoDesvio(pct)
  const Icono = tono === 'bajo' ? IcArrowDown : tono === 'alto' ? IcArrowUp : IcCheck
  return (
    <span className={`gcr-chip gcr-chip--${tono}`}>
      <Icono size={14} aria-hidden="true" />
      {textoDesvio(pct, referencia)}
    </span>
  )
}

export function ConteoValor({ valor, formatear }: { valor: number | null; formatear: (valor: number) => string }) {
  const reducir = useReducedMotion()
  const [actual, setActual] = useState(valor ?? 0)
  const valorActual = useRef(valor ?? 0)
  useEffect(() => {
    if (valor === null || reducir) {
      valorActual.current = valor ?? 0
      setActual(valor ?? 0)
      return
    }
    const inicio = performance.now()
    const anterior = valorActual.current
    let marco = 0
    const actualizar = (ahora: number) => {
      const avance = Math.min((ahora - inicio) / 280, 1)
      const suave = 1 - (1 - avance) ** 3
      const siguiente = anterior + (valor - anterior) * suave
      valorActual.current = siguiente
      setActual(siguiente)
      if (avance < 1) marco = requestAnimationFrame(actualizar)
    }
    marco = requestAnimationFrame(actualizar)
    return () => cancelAnimationFrame(marco)
  }, [valor, reducir])
  return <span>{valor === null ? '—' : formatear(actual)}</span>
}
