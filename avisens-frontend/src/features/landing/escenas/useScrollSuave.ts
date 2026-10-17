import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let instancia: Lenis | null = null

export function irASeccion(id: string) {
  const destino = document.getElementById(id)
  if (!destino) return
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const enfocar = () => {
    destino.tabIndex = -1
    destino.focus({ preventScroll: true })
  }
  if (instancia) instancia.scrollTo(destino, { duration: 2, immediate: reducir, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: enfocar })
  else {
    destino.scrollIntoView({ behavior: reducir ? 'instant' : 'smooth' })
    enfocar()
  }
}

export function irAPosicion(y: number) {
  if (instancia) instancia.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

export function useScrollSuave() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ duration: 1.6, wheelMultiplier: 0.85, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
    instancia = lenis
    let marco = 0
    const cuadro = (tiempo: number) => {
      lenis.raf(tiempo)
      marco = requestAnimationFrame(cuadro)
    }
    marco = requestAnimationFrame(cuadro)

    const alHacerClic = (evento: MouseEvent) => {
      const enlace = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
      const id = enlace?.getAttribute('href')?.slice(1)
      if (!id || !document.getElementById(id)) return
      evento.preventDefault()
      irASeccion(id)
    }
    document.addEventListener('click', alHacerClic)

    return () => {
      cancelAnimationFrame(marco)
      document.removeEventListener('click', alHacerClic)
      lenis.destroy()
      instancia = null
    }
  }, [])
}
