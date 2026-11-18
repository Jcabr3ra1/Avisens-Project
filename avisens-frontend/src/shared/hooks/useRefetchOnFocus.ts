import { useEffect, useRef } from 'react'

/**
 * Dispara una recarga automática cuando la pestaña del navegador o ventana
 * vuelve a estar activa y visible (`visibilitychange` / `focus`).
 *
 * Aplica una ventana de tiempo mínima (throttle) de 5 segundos por defecto
 * para proteger la API y no bombardear el servidor si el usuario alterna
 * velozmente de pestaña.
 */
export function useRefetchOnFocus(
  onRefetch: () => void | Promise<void>,
  intervaloMinimoMs = 5000,
) {
  const ultimaEjecucion = useRef<number>(Date.now())
  const refetchRef = useRef(onRefetch)

  useEffect(() => {
    refetchRef.current = onRefetch
  }, [onRefetch])

  useEffect(() => {
    function intentarRefetch() {
      if (document.visibilityState === 'hidden') return
      const ahora = Date.now()
      if (ahora - ultimaEjecucion.current >= intervaloMinimoMs) {
        ultimaEjecucion.current = ahora
        void refetchRef.current()
      }
    }

    window.addEventListener('focus', intentarRefetch)
    document.addEventListener('visibilitychange', intentarRefetch)

    return () => {
      window.removeEventListener('focus', intentarRefetch)
      document.removeEventListener('visibilitychange', intentarRefetch)
    }
  }, [intervaloMinimoMs])
}
