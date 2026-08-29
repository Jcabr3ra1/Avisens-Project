import { isAxiosError } from 'axios'

export function obtenerMensajeError(error: unknown, mensajeAlternativo: string): string {
  if (!isAxiosError(error) || !error.response) return mensajeAlternativo
  if (error.response.status === 403) return 'No tienes permisos para esta acción.'

  const data = error.response.data as { message?: string | string[] }
  if (!data.message) return mensajeAlternativo
  return Array.isArray(data.message) ? data.message.join(', ') : data.message
}
