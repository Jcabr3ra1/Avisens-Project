import { isAxiosError } from 'axios'

const POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión expiró. Vuelve a entrar.',
  403: 'No tienes permisos para esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'Ese registro ya existe.',
  429: 'Vas muy rápido. Espera un momento y vuelve a intentarlo.',
  500: 'El servidor tuvo un problema. Intenta de nuevo.',
}

function mensajeDelCuerpo(data: unknown): string {
  const cuerpo = data as { message?: string | string[]; errors?: string[] } | undefined

  const message = Array.isArray(cuerpo?.message)
    ? cuerpo.message.join(', ')
    : cuerpo?.message ?? ''

  const errors = Array.isArray(cuerpo?.errors) ? cuerpo.errors.join(', ') : ''

  return [message, errors].filter(Boolean).join(': ')
}

export function mensajeDeError(err: unknown, respaldo: string): string {
  if (!isAxiosError(err)) return respaldo

  if (!err.response) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }

  return (
    mensajeDelCuerpo(err.response.data) ||
    POR_ESTADO[err.response.status] ||
    respaldo
  )
}