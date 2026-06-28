// Manejo del almacenamiento de los tokens JWT y la sesión en localStorage.
// Centralizado aquí para no repetir las claves por todo el código.

import type { UsuarioSesion } from './types'

const ACCESS_KEY = 'avisens_access_token'
const REFRESH_KEY = 'avisens_refresh_token'
const USER_KEY = 'avisens_usuario'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

// --- Sesión: el usuario logueado (incluye su rol) ---

export function setUsuario(usuario: UsuarioSesion): void {
  localStorage.setItem(USER_KEY, JSON.stringify(usuario))
}

export function getUsuario(): UsuarioSesion | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UsuarioSesion
  } catch {
    return null
  }
}

// Rol del usuario actual, o null si no hay sesión.
export function getRol(): string | null {
  return getUsuario()?.rol ?? null
}

// Limpia toda la sesión (tokens + usuario).
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
