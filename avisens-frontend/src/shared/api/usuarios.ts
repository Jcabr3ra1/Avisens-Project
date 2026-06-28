import { api } from './client'
import type { ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario } from './types'

// Funciones del módulo `usuarios` del backend.
// Requieren sesión: el Admin gestiona a todos; el Propietario, solo operarios.

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios')
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

// Borrado permanente del usuario.
export async function eliminarUsuario(id: number): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(`/usuarios/${id}`)
  return data
}
