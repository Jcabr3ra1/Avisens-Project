import { useEffect, useRef } from 'react'

/**
 * Cierra un popover/dropdown:
 *  - al hacer click fuera del contenedor referenciado
 *  - al presionar Escape
 *
 * Se monta sólo cuando `open` es true para no escuchar eventos innecesarios.
 */
export function useDismissable<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open) return

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const el = ref.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      onClose()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  return ref
}
