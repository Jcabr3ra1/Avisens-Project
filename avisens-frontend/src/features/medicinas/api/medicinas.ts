import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export type TipoMedicacion = 'medicacion' | 'tratamiento' | 'diagnostico'

export interface RegistroMedicina {
  id: number
  lote_id: number
  insumo_id: number | null
  tipo: string
  fecha: string
  producto: string | null
  diagnostico: string | null
  dosis: string | null
  via_aplicacion: string | null
  cantidad_aves: number | null
  observaciones: string | null
  insumo?: {
    id: number
    nombre: string
  } | null
}

export type EventoSanitario = RegistroMedicina & {
  lote: { id: number; codigo: string }
}

export interface CrearRegistroMedicinaPayload {
  lote_id: number
  tipo: TipoMedicacion
  fecha: string
  insumo_id?: number
  producto?: string
  diagnostico?: string
  dosis?: string
  via_aplicacion?: string
  cantidad_aves?: number
  metodo_registro: 'manual'
  observaciones?: string
}

export type CrearEventoSanitarioPayload = CrearRegistroMedicinaPayload
export type ActualizarEventoSanitarioPayload = Partial<CrearRegistroMedicinaPayload>

export function listarMedicinas(): Promise<EventoSanitario[]> {
  return listarTodasLasPaginas<EventoSanitario>('/eventos-sanitarios')
}

export async function crearRegistroMedicina(
  payload: CrearRegistroMedicinaPayload,
): Promise<RegistroMedicina> {
  const { data } = await api.post<RegistroMedicina>(
    '/eventos-sanitarios',
    payload,
  )
  return data
}

export const listarEventosSanitarios = listarMedicinas

export async function crearEventoSanitario(
  payload: CrearEventoSanitarioPayload,
): Promise<EventoSanitario> {
  const { data } = await api.post<EventoSanitario>('/eventos-sanitarios', payload)
  return data
}

export async function actualizarEventoSanitario(
  id: number,
  payload: ActualizarEventoSanitarioPayload,
): Promise<EventoSanitario> {
  const { data } = await api.patch<EventoSanitario>(`/eventos-sanitarios/${id}`, payload)
  return data
}

export async function eliminarEventoSanitario(id: number): Promise<void> {
  await api.delete(`/eventos-sanitarios/${id}`)
}