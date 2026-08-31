import { api } from '@shared/api/client'
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  PaginatedResponse,
  RolResumen,
  Usuario,
} from '@shared/api/types'

let solicitudListado: Promise<Usuario[]> | null = null

export async function listarUsuarios(): Promise<Usuario[]> {
  if (solicitudListado) return solicitudListado

  solicitudListado = api.get<PaginatedResponse<Usuario>>('/usuarios', {
    params: { page: 1, limit: 100 },
  }).then(({ data }) => data.data)

  solicitudListado.then(
    () => { solicitudListado = null },
    () => { solicitudListado = null },
  )

  return solicitudListado
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
