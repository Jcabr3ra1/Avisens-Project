import { api } from './client'
import {
  clearTokens,
  getRefreshToken,
  setCambioPasswordToken,
  setTokens,
  setUsuario,
} from './tokens'
import type { LoginPayload, LoginResponse } from './types'

// Funciones de autenticación contra el módulo `auth` del backend.

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)

  if (data.requiere_cambio_password) {
    clearTokens()
    setCambioPasswordToken(data.cambio_password_token)
    return data
  }

  setTokens(data.access_token, data.refresh_token)
  setUsuario(data.usuario)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  // /auth/logout exige el refresh token como Bearer (no el access token).
  if (refreshToken) {
    try {
      await api.post(
        '/auth/logout',
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } },
      )
    } catch {
      // Aunque el backend falle, limpiamos la sesión local igualmente.
    }
  }

  clearTokens()
}

// Permisos efectivos de la sesión. Útil para habilitar acciones en la UI en
// vez de dejar que el backend responda 403 después del clic.
export async function obtenerPermisos(): Promise<string[]> {
  const { data } = await api.get<{ permisos: string[] }>('/auth/permisos')
  return data.permisos
}
