import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface Organizacion {
  id: number
  nombre: string
  nit: string | null
  plan: string
  activa: boolean
  fecha_creacion: string
  // Lo calcula el servidor con un `_count` de Prisma sobre las relaciones, así
  // que cuenta las filas reales y no depende de lo que este usuario alcance a
  // ver en los listados de granjas y usuarios.
  _count: { granjas: number; usuarios: number }
}

export interface CrearOrganizacionPayload {
  nombre: string
  nit?: string
  plan?: string
}

export async function listarOrganizaciones(): Promise<Organizacion[]> {
  return listarTodasLasPaginas<Organizacion>('/organizaciones')
}

export async function crearOrganizacion(
  payload: CrearOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.post<Organizacion>('/organizaciones', payload)
  return data
}

export type ActualizarOrganizacionPayload = Partial<CrearOrganizacionPayload> & {
  activa?: boolean
}

export async function obtenerOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.get<Organizacion>(`/organizaciones/${id}`)
  return data
}

export async function actualizarOrganizacion(
  id: number,
  payload: ActualizarOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}`, payload)
  return data
}

export async function activarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}/activar`)
  return data
}

// Baja lógica: conserva la organización y todo lo que cuelga de ella.
export async function desactivarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.delete<Organizacion>(`/organizaciones/${id}`)
  return data
}
