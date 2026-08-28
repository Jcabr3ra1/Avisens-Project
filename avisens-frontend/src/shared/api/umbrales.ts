import { api } from './client'
import type { PaginatedResponse } from './types'

// El backend versiona el umbral por (galpón, variable, semana de vida) — no por
// sensor. Ojo: `variable` hoy solo admite 'temperatura' | 'humedad' | 'luminosidad'
// (ver umbral-constantes.ts del backend) — CO₂ y NH₃ todavía no tienen umbral
// configurable ahí.
export const VARIABLES_UMBRAL = ['temperatura', 'humedad', 'luminosidad'] as const
export const CRITICIDADES_UMBRAL = ['baja', 'media', 'alta', 'critica'] as const

export interface GalponResumenUmbral {
  id: number
  nombre: string
  granja: { id: number; propietario_id: number }
}

export interface Umbral {
  id: number
  galpon_id: number
  variable: string
  semana_vida: number
  valor_minimo: number
  valor_maximo: number
  unidad: string
  criticidad: string
  vigente: boolean
  version: number
  fecha_creacion: string
  galpon: GalponResumenUmbral
}

export interface CrearUmbralPayload {
  galpon_id: number
  variable: string
  semana_vida: number
  valor_minimo: number
  valor_maximo: number
  unidad: string
  criticidad: string
}

export interface RevisarUmbralPayload {
  valor_minimo?: number
  valor_maximo?: number
  unidad?: string
  criticidad?: string
}

export interface ListarUmbralesQuery {
  galpon_id?: number
  variable?: string
  incluir_historico?: boolean
}

export async function listarUmbrales(
  query: ListarUmbralesQuery = {},
): Promise<Umbral[]> {
  const { data } = await api.get<PaginatedResponse<Umbral>>('/umbrales', {
    params: query,
  })
  return data.data
}

export async function obtenerUmbral(id: number): Promise<Umbral> {
  const { data } = await api.get<Umbral>(`/umbrales/${id}`)
  return data
}

export async function crearUmbral(payload: CrearUmbralPayload): Promise<Umbral> {
  const { data } = await api.post<Umbral>('/umbrales', payload)
  return data
}

// Crea una nueva versión vigente y jubila la anterior (versionado, no update in-place).
export async function revisarUmbral(
  id: number,
  payload: RevisarUmbralPayload,
): Promise<Umbral> {
  const { data } = await api.patch<Umbral>(`/umbrales/${id}/revisar`, payload)
  return data
}

export async function jubilarUmbral(
  id: number,
): Promise<{ id: number; vigente: boolean }> {
  const { data } = await api.delete<{ id: number; vigente: boolean }>(
    `/umbrales/${id}`,
  )
  return data
}
