import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Atrapa el foco dentro de `contenedor` mientras `activo` es verdadero: el Tab
 * deja de escaparse al resto de la página, Escape llama a `onCerrar`, el
 * scroll del body se bloquea, y al desactivarse el foco vuelve a quien lo
 * tenía antes de abrir.
 *
 * Es la lógica que ya usaba `Modal`, separada para que un panel con su propia
 * animación (como `SensorDetail`, que no se desmonta) pueda tener el mismo
 * comportamiento de accesibilidad sin adoptar el marcado del diálogo centrado.
 */
export function useFocoAtrapado(
  contenedor: RefObject<HTMLElement | null>,
  activo: boolean,
  onCerrar: () => void,
): void {
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    if (!activo) return

    const previo = document.activeElement as HTMLElement | null
    const primero = contenedor.current?.querySelector<HTMLElement>(FOCUSABLES)
    primero?.focus()

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onCerrarRef.current()
        return
      }
      if (evento.key !== 'Tab' || !contenedor.current) return

      const focusables = Array.from(
        contenedor.current.querySelectorAll<HTMLElement>(FOCUSABLES),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return

      const inicio = focusables[0]
      const fin = focusables[focusables.length - 1]

      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault()
        fin.focus()
      } else if (!evento.shiftKey && document.activeElement === fin) {
        evento.preventDefault()
        inicio.focus()
      }
    }

    window.addEventListener('keydown', alTeclear)

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowPrevio
      previo?.focus()
    }
  }, [activo, contenedor])
}
