import { useEffect } from 'react'

function prefiereMovimientoReducido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function irASeccion(id: string) {
  const destino = document.getElementById(id)
  if (!destino) return
  const reducir = prefiereMovimientoReducido()
  destino.scrollIntoView({ behavior: reducir ? 'instant' : 'smooth', block: 'start' })
  destino.tabIndex = -1
  destino.focus({ preventScroll: true })
}

export function irAPosicion(y: number) {
  const reducir = prefiereMovimientoReducido()
  window.scrollTo({ top: y, behavior: reducir ? 'instant' : 'smooth' })
}

export function useScrollSuave() {
  useEffect(() => {
    const alHacerClic = (evento: MouseEvent) => {
      const enlace = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
      const id = enlace?.getAttribute('href')?.slice(1)
      if (!id || !document.getElementById(id)) return
      evento.preventDefault()
      irASeccion(id)
    }
    document.addEventListener('click', alHacerClic)
    return () => document.removeEventListener('click', alHacerClic)
  }, [])
}
