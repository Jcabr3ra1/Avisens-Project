import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

// El backend versiona el umbral por (galpón, variable, semana de vida) — no por
// sensor. Ojo: `variable` hoy solo admite 'temperatura' | 'humedad' | 'luminosidad'
// (ver umbral-constantes.ts del backend) — CO₂ y NH₃ todavía no tienen umbral
// configurable ahí.
export const VARIABLES_UMBRAL = ['temperatura', 'humedad', 'luminosidad'] as const
// La escala quedó en tres niveles: 'critica' se eliminó porque ningún camino
// automático la producía y la UI la mostraba igual que 'alta'. El backend ahora
// la rechaza con 400, así que ofrecerla en un formulario sería un 400 seguro.
export const CRITICIDADES_UMBRAL = ['baja', 'media', 'alta'] as const

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

// Sin `limit` llegaban 20 umbrales para toda la instalación, y un galpón ya
// son ~21 (3 variables × 7 semanas de ciclo). Los que faltaban dejaban al
// sensor en `sin_umbral`: la lectura no se comparaba y el galpón salía verde
// aunque estuviera fuera de rango.
export async function listarUmbrales(
  query: ListarUmbralesQuery = {},
): Promise<Umbral[]> {
  return listarTodasLasPaginas<Umbral>('/umbrales', { ...query })
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
