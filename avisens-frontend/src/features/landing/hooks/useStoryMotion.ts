import { useEffect, type RefObject } from 'react'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

// Un único reloj de scroll: mide al cambiar el tamaño y escribe transformaciones
// sobre los elementos, sin actualizar React ni heredar variables por fotograma.
export function useStoryMotion(rootRef: RefObject<HTMLElement | null>, paused: boolean) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let measurePending = true
    let disposed = false
    const progress = root.querySelector<HTMLElement>('[data-story-progress]')
    const opening = root.querySelector<HTMLElement>('[data-opening-copy]')
    const openingMedia = root.querySelector<HTMLElement>('[data-opening-media]')
    const recordScene = root.querySelector<HTMLElement>('[data-record-scene]')
    const records = [...root.querySelectorAll<HTMLElement>('[data-record]')]
    const beats = [...root.querySelectorAll<HTMLElement>('[data-story-step]')]
    const parallax = [...root.querySelectorAll<HTMLElement>('[data-story-parallax]')]
    const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')]
    const navLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]')]
    const transforms = [opening, openingMedia, ...records, ...parallax].filter((el): el is HTMLElement => el !== null)
    let chapterPositions: { el: HTMLElement; top: number }[] = []
    let mediaPositions: { el: HTMLElement; top: number; height: number }[] = []
    let openingTop = 0
    let openingTravel = 1
    let recordTop = 0
    let recordTravel = 1
    let documentTravel = 1
    let lastBeat = -1
    let lastChapter = ''
    let enabled = !paused && !preference.matches

    const measure = () => {
      const y = window.scrollY
      const scene = root.querySelector<HTMLElement>('[data-opening-scene]')
      const stage = scene?.querySelector<HTMLElement>('.av-stage')
      openingTop = scene ? scene.getBoundingClientRect().top + y : 0
      openingTravel = Math.max(1, (scene?.offsetHeight ?? 1) - (stage?.offsetHeight ?? window.innerHeight))
      recordTop = recordScene ? recordScene.getBoundingClientRect().top + y : 0
      recordTravel = Math.max(1, (recordScene?.offsetHeight ?? 1) - (recordScene?.querySelector<HTMLElement>('.av-stage')?.offsetHeight ?? window.innerHeight))
      chapterPositions = chapters.map(el => ({ el, top: el.getBoundingClientRect().top + y }))
      mediaPositions = parallax.map(el => ({ el, top: el.parentElement!.getBoundingClientRect().top + y, height: el.parentElement!.offsetHeight }))
      documentTravel = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      measurePending = false
    }
    const draw = () => {
      frame = 0
      if (measurePending) measure()
      const y = window.scrollY
      if (progress) progress.style.transform = `scaleX(${clamp(y / documentTravel)})`
      const current = [...chapterPositions].reverse().find(item => item.top <= y + window.innerHeight * 0.45)?.el.id ?? ''
      if (current !== lastChapter) {
        navLinks.forEach(link => current === link.hash.slice(1) ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'))
        lastChapter = current
      }
      if (!enabled) return
      const p = clamp((y - openingTop) / openingTravel)
      if (opening) {
        opening.style.transform = `translate3d(0, ${-p * 84}px, 0)`
        opening.style.opacity = `${1 - p * 0.84}`
      }
      if (openingMedia) openingMedia.style.transform = `scale(${1 + p * 0.09})`
      for (const item of mediaPositions) {
        const local = clamp((y + window.innerHeight - item.top) / (item.height + window.innerHeight))
        item.el.style.transform = `translate3d(0, ${(local - 0.5) * -52}px, 0) scale(1.08)`
      }
      const rp = clamp((y - recordTop) / recordTravel)
      const activeBeat = Math.min(2, Math.floor(rp * 3))
      if (activeBeat !== lastBeat) {
        beats.forEach((beat, i) => beat.dataset.active = String(i === activeBeat))
        records.forEach((record, i) => record.dataset.active = String(i <= activeBeat))
        lastBeat = activeBeat
      }
      records.forEach((record, i) => {
        const alignment = clamp((rp - i * 0.17) / 0.36)
        record.style.transform = `translate3d(${(1 - alignment) * (i % 2 === 0 ? 36 : -26)}px, ${(1 - alignment) * (i + 1) * 12}px, 0) rotate(${(1 - alignment) * (i % 2 === 0 ? 3 : -3)}deg)`
      })
    }
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw)
    }
    const resetMotion = () => {
      transforms.forEach(el => el.style.removeProperty('transform'))
      opening?.style.removeProperty('opacity')
      beats.forEach(beat => beat.dataset.active = 'true')
      records.forEach(record => record.dataset.active = 'true')
    }
    const sync = () => {
      enabled = !paused && !preference.matches
      root.dataset.motion = enabled ? 'on' : 'off'
      resetMotion()
      lastBeat = -1
      measurePending = true
      schedule()
    }
    const resize = () => { measurePending = true; schedule() }
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).dataset.visible = 'true'
          reveals.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    root.querySelectorAll('[data-story-reveal]').forEach(el => reveals.observe(el))
    const sizes = new ResizeObserver(resize)
    sizes.observe(root)
    preference.addEventListener('change', sync)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', schedule)
    document.fonts.ready.then(() => { if (!disposed) resize() })
    sync()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      reveals.disconnect()
      sizes.disconnect()
      preference.removeEventListener('change', sync)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', schedule)
      resetMotion()
      delete root.dataset.motion
    }
  }, [rootRef, paused])
}
