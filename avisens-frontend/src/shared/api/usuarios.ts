import { api } from './client'
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  PaginatedResponse,
  Usuario,
} from './types'

// Funciones del módulo `usuarios` del backend.
// Requieren sesión: el Admin gestiona a todos; el Propietario, solo operarios.

export async function listarUsuarios(): Promise<Usuario[]> {
  // El backend pagina: { data, meta }. Devolvemos solo el array `data` para que
  // los componentes puedan hacer `.filter(...)` sin reventar.
  const { data } = await api.get<PaginatedResponse<Usuario>>('/usuarios')
  return data.data
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

// Borrado permanente del usuario. Usa la ruta /permanente: el DELETE simple del
// backend solo DESACTIVA (borrado suave). Para eso ya está el interruptor de
// Estado; este "Eliminar" quita al usuario de verdad. Falla (400) si tiene
// datos asociados (p. ej. granjas), y el backend impide borrar tu propia cuenta.
export async function eliminarUsuario(id: number): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(`/usuarios/${id}/permanente`)
  return data
}
