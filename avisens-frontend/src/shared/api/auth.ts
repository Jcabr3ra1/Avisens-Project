import { api, nuevaGeneracion } from './client'
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

  // Generación nueva DESPUÉS de tener la respuesta (un login fallido no
  // debe invalidar nada) y ANTES de escribir los tokens: cualquier
  // renovación vieja que siga en vuelo queda marcada como de una
  // generación anterior desde este mismo instante.
  nuevaGeneracion()
  setTokens(data.access_token, data.refresh_token)
  setUsuario(data.usuario)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  // Efecto local INMEDIATO, antes de tocar la red: la generación sube y el
  // storage se limpia aquí mismo. Así, sea cual sea el resultado de la
  // llamada al backend (éxito, 401, tarde, nunca llega), ya no tiene nada
  // que escribir -- el storage y la generación ya cambiaron.
  nuevaGeneracion()
  clearTokens()

  if (refreshToken) {
    // El refresh token va en el body (igual que /auth/refresh), nunca en
    // Authorization. Best-effort: no se espera ni se deja que su
    // resultado afecte el cierre de sesión local, que ya ocurrió arriba.
    void api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {
      // Nada que hacer: el cierre local ya ocurrió.
    })
  }
}

// Permisos efectivos de la sesión. Útil para habilitar acciones en la UI en
// vez de dejar que el backend responda 403 después del clic.
export async function obtenerPermisos(): Promise<string[]> {
  const { data } = await api.get<{ permisos: string[] }>('/auth/permisos')
  return data.permisos
}
