import { useEffect, useState } from 'react'

type Tema = 'claro' | 'oscuro'
const CLAVE_TEMA = 'avisens.tema'

function leerTema(): Tema {
  try {
    return window.localStorage.getItem(CLAVE_TEMA) === 'oscuro' ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

// El tema oscuro vive solo dentro del panel: la landing y el acceso siguen claros.
export function useTemaPanel() {
  const [tema, setTema] = useState<Tema>(leerTema)

  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'oscuro') raiz.dataset.theme = 'dark'
    else delete raiz.dataset.theme
    try { window.localStorage.setItem(CLAVE_TEMA, tema) } catch { /* sin almacenamiento */ }
    return () => { delete raiz.dataset.theme }
  }, [tema])

  return { tema, alternar: () => setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro')) }
}
