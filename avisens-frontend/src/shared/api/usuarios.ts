import { api } from './client'
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  PaginatedResponse,
  RolResumen,
  Usuario,
} from './types'

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<PaginatedResponse<Usuario>>('/usuarios', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function listarRolesUsuario(): Promise<RolResumen[]> {
  const { data } = await api.get<RolResumen[]>('/usuarios/catalogos/roles')
  return data
}

export async function obtenerUsuario(id: number): Promise<Usuario> {
  const { data } = await api.get<Usuario>(`/usuarios/${id}`)
  return data
}

export async function crearUsuario(payload: CrearUsuarioPayload): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', payload)
  return data
}

export async function actualizarUsuario(
  id: number,
  payload: ActualizarUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, payload)
  return data
}

export async function eliminarUsuario(id: number): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(`/usuarios/${id}/permanente`)
  return data
}
