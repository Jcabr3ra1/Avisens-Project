import { api } from './client'

export type CanalOrigen = 'web' | 'whatsapp'

export type RutaChat = 'cotizacion' | 'general'

export type TipoPregunta = 'opcion_unica' | 'texto_libre' | 'numero' | 'si_no'

export interface PreguntaChatbot {
  codigo: string
  texto: string
  tipo: TipoPregunta
  opciones: string[] | null
}

export interface RespuestaChatbot {
  sesion_id: string
  pregunta: PreguntaChatbot | null
  mensaje_transicion: string | null
  progreso: number | null
  total_pasos: number | null
  finalizado: boolean
  puntaje_total: number | null
  clasificacion: string | null
}

export async function iniciarConversacion(
  canal_origen: CanalOrigen = 'web',
  ruta: RutaChat = 'cotizacion',
): Promise<RespuestaChatbot> {
  const { data } = await api.post<RespuestaChatbot>('/chatbot/iniciar', {
    canal_origen,
    ruta,
  })
  return data
}

export async function responderPregunta(
  sesion_id: string,
  respuesta: string,
): Promise<RespuestaChatbot> {
  const { data } = await api.post<RespuestaChatbot>('/chatbot/responder', {
    sesion_id,
    respuesta,
  })
  return data
}
