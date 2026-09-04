import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface TipoAlimento {
  id: number
  nombre: string
  marca: string | null
  etapa: string | null
  presentacion: string | null
  dia_inicio: number | null
  dia_fin: number | null
  consumo_total_esperado_g: number | null
  activo: boolean
}

export interface CrearTipoAlimentoPayload {
  nombre: string
  marca?: string
  etapa?: string
  presentacion?: string
  dia_inicio?: number
  dia_fin?: number
  consumo_total_esperado_g?: number
}

export type ActualizarTipoAlimentoPayload = Partial<CrearTipoAlimentoPayload> & {
  activo?: boolean
}

export async function listarTiposAlimento(): Promise<TipoAlimento[]> {
  return listarTodasLasPaginas<TipoAlimento>('/tipos-alimento')
}

export async function obtenerTipoAlimento(id: number): Promise<TipoAlimento> {
  const { data } = await api.get<TipoAlimento>(`/tipos-alimento/${id}`)
  return data
}

export async function crearTipoAlimento(
  payload: CrearTipoAlimentoPayload,
): Promise<TipoAlimento> {
  const { data } = await api.post<TipoAlimento>('/tipos-alimento', payload)
  return data
}

export async function actualizarTipoAlimento(
  id: number,
  payload: ActualizarTipoAlimentoPayload,
): Promise<TipoAlimento> {
  const { data } = await api.patch<TipoAlimento>(
    `/tipos-alimento/${id}`,
    payload,
  )
  return data
}

export async function activarTipoAlimento(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.patch<{ id: number; activo: boolean }>(
    `/tipos-alimento/${id}/activar`,
  )
  return data
}

export async function desactivarTipoAlimento(
  id: number,
): Promise<{ id: number; activo: boolean }> {
  const { data } = await api.delete<{ id: number; activo: boolean }>(
    `/tipos-alimento/${id}`,
  )
  return data
}

export async function eliminarTipoAlimentoPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/tipos-alimento/${id}/permanente`,
  )
  return data
}
