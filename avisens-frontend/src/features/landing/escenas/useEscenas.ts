import { useEffect, type RefObject } from 'react'

type Beat = { el: HTMLElement; desde: number; hasta: number; activo?: boolean }

type Escena = {
  el: HTMLElement
  salida: HTMLElement | null
  beats: Beat[]
  tema: string
  dia: [number, number] | null
  top: number
  alto: number
  p: number
}

const limitar = (valor: number, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, valor))

export function useEscenas(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const contenedor = raiz.current
    if (!contenedor) return

    const escenas: Escena[] = [...contenedor.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => {
      const [desde, hasta] = (el.dataset.dia ?? '').split(' ').map(Number)
      return {
        el,
        salida: el.querySelector<HTMLElement>('[data-scene-exit]'),
        beats: [...el.querySelectorAll<HTMLElement>('[data-beat]')].map((beat) => {
          const [inicio, fin = 1.01] = (beat.dataset.beat ?? '0').split(' ').map(Number)
          return { el: beat, desde: inicio, hasta: fin }
        }),
        tema: el.dataset.theme ?? 'papel',
        dia: Number.isFinite(desde) ? [desde, Number.isFinite(hasta) ? hasta : desde] : null,
        top: 0,
        alto: 0,
        p: -1,
      }
    })
    const contadorDia = contenedor.querySelector<HTMLElement>('[data-dia-actual]')
    let altoVentana = window.innerHeight
    let programado = false
    let diaMostrado = -1

    const medir = () => {
      altoVentana = window.innerHeight
      for (const escena of escenas) {
        escena.top = escena.el.getBoundingClientRect().top + window.scrollY
        escena.alto = escena.el.offsetHeight
        escena.p = -1
      }
      programar()
    }

    const cuadro = () => {
      programado = false
      const y = window.scrollY
      let activa: Escena | undefined
      for (const escena of escenas) {
        const arriba = escena.top - y
        const abajo = arriba + escena.alto
        if (arriba <= altoVentana / 2 && abajo > altoVentana / 2) activa = escena
        if (abajo < -altoVentana || arriba > altoVentana * 2) continue
        // La escena termina antes de que la cabecera siguiente entre en lectura.
        // Se calcula fuera del progreso fijado en 1 para funcionar también al volver.
        if (escena.salida) {
          const salida = limitar((abajo - altoVentana * .75) / (altoVentana * .25))
          escena.salida.style.opacity = salida.toFixed(4)
        }
        const recorrido = escena.alto - altoVentana
        const p = recorrido > 0 ? limitar(-arriba / recorrido) : arriba <= 0 ? 1 : 0
        if (p === escena.p) continue
        escena.p = p
        escena.el.style.setProperty('--p', p.toFixed(4))
        for (const beat of escena.beats) {
          const activo = p >= beat.desde && p < beat.hasta
          if (activo !== beat.activo) {
            beat.activo = activo
            beat.el.classList.toggle('is-on', activo)
          }
        }
      }
      if (activa) {
        if (contenedor.dataset.theme !== activa.tema) contenedor.dataset.theme = activa.tema
        if (activa.dia && contadorDia) {
          const [desde, hasta] = activa.dia
          const dia = Math.round(desde + (hasta - desde) * Math.max(activa.p, 0))
          if (dia !== diaMostrado) {
            diaMostrado = dia
            contadorDia.textContent = String(dia)
          }
        }
      }
    }

    function programar() {
      if (programado) return
      programado = true
      requestAnimationFrame(cuadro)
    }

    const observador = new ResizeObserver(medir)
    observador.observe(contenedor)
    window.addEventListener('scroll', programar, { passive: true })
    window.addEventListener('resize', medir)
    void document.fonts?.ready.then(medir)
    medir()

    return () => {
      observador.disconnect()
      window.removeEventListener('scroll', programar)
      window.removeEventListener('resize', medir)
    }
  }, [raiz])
}
