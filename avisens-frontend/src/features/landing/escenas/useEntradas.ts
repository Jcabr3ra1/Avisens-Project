import { useEffect, type RefObject } from 'react'

export function useEntradas(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const contenedor = raiz.current
    if (!contenedor) return
    // Las tarjetas ya tienen entradas propias con Motion; su contenedor queda estable.
    const elementos = [...contenedor.querySelectorAll<HTMLElement>('.esc-plano > :not(.esc-bento), .esc-relato > *')]
    elementos.forEach((elemento, indice) => {
      elemento.classList.add('esc-entra')
      elemento.style.setProperty('--retraso', `${(indice % 4) * 80}ms`)
    })
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return
        entrada.target.classList.add('is-visible')
        observador.unobserve(entrada.target)
      })
    }, { rootMargin: '0px 0px -12% 0px' })
    elementos.forEach((elemento) => observador.observe(elemento))
    return () => {
      observador.disconnect()
      elementos.forEach((elemento) => {
        elemento.classList.remove('esc-entra', 'is-visible')
        elemento.style.removeProperty('--retraso')
      })
    }
  }, [raiz])
}
