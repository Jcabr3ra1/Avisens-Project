import { api } from '@shared/api/client'

export interface PreguntarPayload {
  pregunta: string
  conversacion_id?: number
}

export interface RespuestaCopiloto {
  conversacion_id: number
  respuesta: string
  herramientas_usadas: number
}

export async function preguntarAlCopiloto(
  payload: PreguntarPayload,
): Promise<RespuestaCopiloto> {
  const { data } = await api.post<RespuestaCopiloto>('/copiloto/preguntar', payload)
  return data
}
