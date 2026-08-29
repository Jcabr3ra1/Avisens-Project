import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface Granja {
  id: number
  nombre: string
  direccion: string | null
  municipio: string | null
  departamento: string | null
  latitud: number | null
  longitud: number | null
  area_total_m2: number | null
  activa: boolean
  fecha_creacion: string
  propietario: { id: number; nombre_completo: string }
}

export interface CrearGranjaPayload {
  nombre: string
  direccion?: string
  municipio?: string
  departamento?: string
  latitud?: number
  longitud?: number
  area_total_m2?: number
  propietario_id?: number
}

export interface PropietarioGranja {
  id: number
  nombre_completo: string
  activo: boolean
}

interface UsuarioParaGranja extends PropietarioGranja {
  rol: { nombre: string }
}

export type ActualizarGranjaPayload = Partial<CrearGranjaPayload> & {
  activa?: boolean
}

export async function listarPropietariosGranja(): Promise<PropietarioGranja[]> {
  const { data } = await api.get<PaginatedResponse<UsuarioParaGranja>>(
    '/usuarios',
    {
      params: {
        page: 1,
        limit: 100,
      },
    },
  )

  return data.data
    .filter((usuario) => usuario.rol.nombre === 'Propietario')
    .map(({ id, nombre_completo, activo }) => ({ id, nombre_completo, activo }))
}

export async function listarGranjas(): Promise<Granja[]> {
  const { data } = await api.get<PaginatedResponse<Granja>>(
    '/granjas',
    {
      params: {
        page: 1,
        limit: 100,
      },
    },
  )

  return data.data
}

export async function obtenerGranja(id: number): Promise<Granja> {
  const { data } = await api.get<Granja>(`/granjas/${id}`)
  return data
}

export async function crearGranja(payload: CrearGranjaPayload): Promise<Granja> {
  const { data } = await api.post<Granja>('/granjas', payload)
  return data
}

export async function actualizarGranja(
  id: number,
  payload: ActualizarGranjaPayload,
): Promise<Granja> {
  const { data } = await api.patch<Granja>(`/granjas/${id}`, payload)
  return data
}

export async function activarGranja(
  id: number,
): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.patch<{ id: number; activa: boolean }>(
    `/granjas/${id}/activar`,
  )
  return data
}

export async function desactivarGranja(
  id: number,
): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.delete<{ id: number; activa: boolean }>(
    `/granjas/${id}`,
  )
  return data
}

export async function eliminarGranjaPermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/granjas/${id}/permanente`,
  )
  return data
}
