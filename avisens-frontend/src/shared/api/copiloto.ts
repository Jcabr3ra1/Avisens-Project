import { api } from './client'

export interface RespuestaCopiloto {
  respuesta: string
  conversacion_id: number
}

export async function preguntarCopiloto(
  pregunta: string,
  conversacionId?: number,
): Promise<RespuestaCopiloto> {
  const { data } = await api.post<RespuestaCopiloto>('/copiloto/preguntar', {
    pregunta,
    ...(conversacionId ? { conversacion_id: conversacionId } : {}),
  })
  return data
}
