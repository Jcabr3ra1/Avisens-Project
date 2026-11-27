import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface ComandoVoz {
  id: number
  galpon_id: number
  comando_texto: string
  modo_conexion: string
  id_sincronizacion: string | null
  fecha_ejecucion: string | null
  fecha_registro: string
  mensaje?: string
  requiere_clarificacion?: boolean
}

export interface InterpretarComandoPayload {
  galpon_id: number
  comando_texto: string
  // El operario puede dictar sin señal: el comando se guarda en el equipo y
  // se sincroniza después, por eso `offline` no es un error sino un modo.
  modo_conexion?: 'online' | 'offline'
  id_sincronizacion?: string
  fecha_ejecucion?: string
}

export async function interpretarComando(
  payload: InterpretarComandoPayload,
): Promise<ComandoVoz> {
  const { data } = await api.post<ComandoVoz>('/comandos-voz/interpretar', payload)
  return data
}

// Sube de una vez los comandos que quedaron pendientes sin conexión.
export async function sincronizarComandos(
  comandos: InterpretarComandoPayload[],
): Promise<ComandoVoz[]> {
  const { data } = await api.post<ComandoVoz[]>('/comandos-voz/sincronizar', { comandos })
  return data
}

export async function listarHistorialComandos(): Promise<ComandoVoz[]> {
  const { data } = await api.get<PaginatedResponse<ComandoVoz>>('/comandos-voz/historial', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}
