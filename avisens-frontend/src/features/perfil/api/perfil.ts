import { api } from '@shared/api/client'
import type { PerfilCuenta } from '../model/perfil'

export async function obtenerPerfil(): Promise<PerfilCuenta> {
  const { data } = await api.get<PerfilCuenta>('/auth/perfil')
  return data
}

export async function cambiarPasswordPropia(passwordActual: string, nuevaPassword: string): Promise<string> {
  const { data } = await api.post<{ mensaje: string }>('/auth/cambiar-password', {
    password_actual: passwordActual,
    nueva_password: nuevaPassword,
  })
  return data.mensaje
}
