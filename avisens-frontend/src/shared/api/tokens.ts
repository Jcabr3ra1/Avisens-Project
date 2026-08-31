// Manejo del almacenamiento de los tokens JWT y la sesión en localStorage.
// Centralizado aquí para no repetir las claves por todo el código.

import type { UsuarioSesion } from './types'

const ACCESS_KEY = 'avisens_access_token'
const REFRESH_KEY = 'avisens_refresh_token'
const USER_KEY = 'avisens_usuario'
const CAMBIO_PASSWORD_KEY = 'avisens_cambio_password_token'
const MODO_VISTA_KEY = 'avisens_modo_vista'
const ROL_ADMINISTRADOR = 'Administrador'
const ROLES_DE_VISTA = [ROL_ADMINISTRADOR, 'Propietario', 'Operario'] as const

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

export function setCambioPasswordToken(token: string): void {
  sessionStorage.setItem(CAMBIO_PASSWORD_KEY, token)
}

export function getCambioPasswordToken(): string | null {
  return sessionStorage.getItem(CAMBIO_PASSWORD_KEY)
}

export function clearCambioPasswordToken(): void {
  sessionStorage.removeItem(CAMBIO_PASSWORD_KEY)
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

export function getRolVista(): string | null {
  const rolAutenticado = getRol()
  if (rolAutenticado !== ROL_ADMINISTRADOR) return rolAutenticado

  const modoGuardado = localStorage.getItem(MODO_VISTA_KEY)
  return ROLES_DE_VISTA.includes(modoGuardado as typeof ROLES_DE_VISTA[number])
    ? modoGuardado
    : rolAutenticado
}

export function guardarRolVista(rolVista: string): void {
  if (getRol() !== ROL_ADMINISTRADOR) return
  if (!ROLES_DE_VISTA.includes(rolVista as typeof ROLES_DE_VISTA[number])) return
  localStorage.setItem(MODO_VISTA_KEY, rolVista)
}

// Limpia toda la sesión (tokens + usuario).
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(MODO_VISTA_KEY)
  clearCambioPasswordToken()
}
