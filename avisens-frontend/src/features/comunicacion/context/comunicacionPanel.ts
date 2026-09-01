import { createContext, useContext } from 'react'
import type { PestanaComunicacion } from '../model/comunicacion'

export type ContextoComunicacion = {
  galponId: number | null
  galponNombre: string | null
}

export type EstadoComunicacion = {
  abierto: boolean
  pestana: PestanaComunicacion
  contexto: ContextoComunicacion
  alternar: (pestana: PestanaComunicacion, contexto?: ContextoComunicacion) => void
  cerrar: () => void
}

export const ComunicacionPanelContext = createContext<EstadoComunicacion | null>(null)

export function useComunicacionPanel(): EstadoComunicacion {
  const contexto = useContext(ComunicacionPanelContext)
  if (!contexto) {
    throw new Error('useComunicacionPanel debe usarse dentro de ComunicacionPanelProvider')
  }
  return contexto
}
