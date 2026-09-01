import { type ReactNode, useCallback, useMemo, useState } from 'react'
import type { PestanaComunicacion } from '../model/comunicacion'
import { ComunicacionPanelContext, type ContextoComunicacion } from './comunicacionPanel'

function ComunicacionPanelProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const [pestana, setPestana] = useState<PestanaComunicacion>('equipo')
  const [contexto, setContexto] = useState<ContextoComunicacion>({
    galponId: null,
    galponNombre: null,
  })

  const alternar = useCallback((siguientePestana: PestanaComunicacion, siguienteContexto?: ContextoComunicacion) => {
    if (abierto && pestana === siguientePestana) {
      setAbierto(false)
      return
    }

    setPestana(siguientePestana)
    if (siguienteContexto) setContexto(siguienteContexto)
    setAbierto(true)
  }, [abierto, pestana])

  const cerrar = useCallback(() => setAbierto(false), [])

  const value = useMemo(() => ({ abierto, pestana, contexto, alternar, cerrar }), [
    abierto,
    pestana,
    contexto,
    alternar,
    cerrar,
  ])

  return <ComunicacionPanelContext.Provider value={value}>{children}</ComunicacionPanelContext.Provider>
}

export default ComunicacionPanelProvider
