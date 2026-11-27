import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let ultimoFocoFueraDeDialogo: HTMLElement | null = null
const pila: { elemento: HTMLElement; inertPrevio: boolean }[] = []
let overflowOriginal = ''

function actualizarPila() {
  pila.forEach((entrada, indice) => {
    entrada.elemento.inert = indice < pila.length - 1 || entrada.inertPrevio
  })
}

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (evento) => {
    const objetivo = evento.target
    if (
      objetivo instanceof HTMLElement
      && objetivo !== document.body
      && !objetivo.closest('[role="dialog"]')
    ) {
      ultimoFocoFueraDeDialogo = objetivo
    }
  })
}

export function obtenerFocoDeRetorno(): HTMLElement | null {
  const activo = document.activeElement
  if (activo instanceof HTMLElement && activo !== document.body) return activo
  return ultimoFocoFueraDeDialogo?.isConnected ? ultimoFocoFueraDeDialogo : null
}

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
  retornoFoco?: HTMLElement | null,
  focoInicial?: RefObject<HTMLElement | null>,
): void {
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    if (!activo) return

    const previo = retornoFoco ?? document.activeElement as HTMLElement | null
    const elemento = contenedor.current
    if (!elemento) return
    const entrada = { elemento, inertPrevio: elemento.inert }
    if (pila.length === 0) overflowOriginal = document.body.style.overflow
    pila.push(entrada)
    actualizarPila()
    document.body.style.overflow = 'hidden'
    const primero = focoInicial?.current ?? elemento.querySelector<HTMLElement>(FOCUSABLES)
    ;(primero ?? elemento).focus()

    function alTeclear(evento: KeyboardEvent) {
      if (pila[pila.length - 1] !== entrada) return
      if (evento.key === 'Escape') {
        evento.preventDefault()
        evento.stopImmediatePropagation()
        onCerrarRef.current()
        return
      }
      if (evento.key !== 'Tab' || !contenedor.current) return

      const focusables = Array.from(
        contenedor.current.querySelectorAll<HTMLElement>(FOCUSABLES),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) { evento.preventDefault(); elemento?.focus(); return }

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

    window.addEventListener('keydown', alTeclear, true)

    return () => {
      window.removeEventListener('keydown', alTeclear, true)
      const eraSuperior = pila[pila.length - 1] === entrada
      const indice = pila.indexOf(entrada)
      if (indice !== -1) pila.splice(indice, 1)
      elemento.inert = entrada.inertPrevio
      actualizarPila()
      if (pila.length === 0) document.body.style.overflow = overflowOriginal
      if (eraSuperior && previo?.isConnected) previo.focus()
    }
  }, [activo, contenedor, retornoFoco, focoInicial])
}
