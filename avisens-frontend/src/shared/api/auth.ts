import { api } from './client'
import { clearTokens, getRefreshToken, setTokens, setUsuario } from './tokens'
import type { LoginPayload, LoginResponse } from './types'

// Funciones de autenticación contra el módulo `auth` del backend.

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  setTokens(data.access_token, data.refresh_token)
  setUsuario(data.usuario) // guardamos el usuario (y su rol) para las vistas por rol
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
