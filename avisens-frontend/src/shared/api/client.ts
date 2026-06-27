import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens'
import type { TokensResponse } from './types'

// Cliente axios central. Todo el frontend consume el backend a través de esta
// instancia, así la URL base, el token y el refresh viven en un solo lugar.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- Interceptor de petición: adjunta el access token en cada llamada ---
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- Interceptor de respuesta: renueva el token cuando expira (401) ---

// Marca interna para no reintentar una petición más de una vez.
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Evita disparar varios refresh en paralelo: las peticiones que fallen mientras
// se renueva el token esperan a la misma promesa.
let refreshPromise: Promise<string> | null = null

async function renovarAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No hay refresh token')

  // Llamada directa con axios (sin la instancia `api`) para no entrar en bucle
  // de interceptores y para mandar el refresh token como Bearer.
  const { data } = await axios.post<TokensResponse>(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  )

  setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined

    const esRefresh = original?.url?.includes('/auth/refresh')
    const debeRenovar =
      error.response?.status === 401 && original && !original._retry && !esRefresh

    if (!debeRenovar) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      refreshPromise = refreshPromise ?? renovarAccessToken()
      const nuevoToken = await refreshPromise
      refreshPromise = null

      original.headers.Authorization = `Bearer ${nuevoToken}`
      return api(original)
    } catch (refreshError) {
      refreshPromise = null
      clearTokens()
      // El refresh falló: la sesión se acabó. Redirigimos al login.
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    }
  },
)
