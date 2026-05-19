import { useEffect } from 'react'

/**
 * Pone `data-tab-hidden="true"` en `<body>` mientras la pestaña no es visible.
 * El CSS aprovecha ese flag para pausar animaciones (`animation-play-state: paused`),
 * ahorrando batería en background.
 */
export function usePauseOnHidden() {
  useEffect(() => {
    const update = () => {
      document.body.dataset.tabHidden = document.hidden ? 'true' : 'false'
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      delete document.body.dataset.tabHidden
    }
  }, [])
}
