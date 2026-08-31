export type PestanaComunicacion = 'equipo' | 'ia' | 'voz'

export type AutorMensaje = 'lia' | 'usuario'

export type MensajeCopiloto = {
  id: string
  autor: AutorMensaje
  contenido: string
}

export const SUGERENCIAS_COPILOTO = [
  'Resume las alertas activas',
  '¿Cómo va mi producción?',
  '¿Qué debo revisar hoy?',
]

// El id se arma en el cliente porque un mensaje del usuario existe en pantalla
// antes de que el backend le asigne uno: React necesita una `key` estable
// desde el primer render.
export function idMensajeUsuario(): string {
  return `u-${Date.now()}`
}

export function idMensajeCopiloto(conversacionId: number): string {
  return `ia-${conversacionId}-${Date.now()}`
}
