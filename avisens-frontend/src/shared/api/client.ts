import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokens'
import type { TokensResponse } from './types'

// Cliente axios central. Todo el frontend consume el backend a través de esta
// instancia, así la URL base, el token y el refresh viven en un solo lugar.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- Generación de sesión --------------------------------------------------
//
// Un contador, no una bandera booleana: una bandera ("sesionCerrada: true")
// no distingue "se cerró sesión" de "se cerró sesión Y LUEGO se inició una
// nueva" -- una vez en true no hay forma de saber si el estado actual sigue
// siendo "cerrado" o ya es "una sesión nueva, distinta a la que disparó esta
// petición". Un número que solo sube sí lo distingue: cada petición guarda
// la generación con la que salió, y antes de tener efecto (escribir tokens,
// limpiarlos, reintentar una petición) se compara contra la generación
// ACTUAL -- si ya no coinciden, se descarta, nunca se fuerza a que pase.
let generacionSesion = 0
let refrescoEnCurso: { generacion: number; promesa: Promise<string> } | null = null

export function generacionActual(): number {
  return generacionSesion
}

// login() y logout() la llaman: sube la generación y descarta la referencia
// a cualquier refresco en curso de la generación anterior (si hace falta
// uno nuevo, se crea ya con la generación actualizada -- ver
// obtenerPromesaDeRenovacion).
export function nuevaGeneracion(): number {
  generacionSesion += 1
  refrescoEnCurso = null
  return generacionSesion
}

// No es un fallo real de la sesión actual: la sesión cambió (logout y/o
// login nuevo) mientras esta operación estaba en vuelo. El interceptor la
// distingue de un 401 genuino para no limpiar ni redirigir de nuevo.
export class RenovacionDescartadaError extends Error {
  constructor() {
    super('La sesión cambió mientras esta renovación estaba en curso')
    this.name = 'RenovacionDescartadaError'
  }
}

async function renovarAccessToken(miGeneracion: number): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No hay refresh token')

  let datos: TokensResponse
  try {
    // Llamada directa con axios (sin la instancia `api`) para no entrar en
    // bucle de interceptores. El refresh token va en el body, igual que lo
    // espera el backend -- nunca en Authorization (eso queda reservado para
    // el access token en el resto de la API).
    const respuesta = await axios.post<TokensResponse>(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      { refresh_token: refreshToken },
    )
    datos = respuesta.data
  } catch (error) {
    if (miGeneracion !== generacionSesion) throw new RenovacionDescartadaError()
    throw error
  }

  if (miGeneracion !== generacionSesion) {
    // Llegó tarde: no escribir tokens encima de una sesión más nueva (o de
    // un storage recién vaciado por logout).
    throw new RenovacionDescartadaError()
  }
  setTokens(datos.access_token, datos.refresh_token)
  return datos.access_token
}

// Evita disparar varios refresh en paralelo para la MISMA generación: las
// peticiones que fallen mientras se renueva esperan a la misma promesa. Si
// la generación ya cambió, no reutiliza la referencia vieja -- arranca una
// nueva, con la generación actual.
export function obtenerPromesaDeRenovacion(): Promise<string> {
  const generacion = generacionSesion
  if (!refrescoEnCurso || refrescoEnCurso.generacion !== generacion) {
    const promesa = renovarAccessToken(generacion).finally(() => {
      // Solo libera la referencia si sigue siendo ESTE refresco -- uno más
      // nuevo (de una generación posterior) ya pudo haber tomado su lugar,
      // y un refresh viejo que termina tarde no debe borrarlo.
      if (refrescoEnCurso?.generacion === generacion) refrescoEnCurso = null
    })
    refrescoEnCurso = { generacion, promesa }
  }
  return refrescoEnCurso.promesa
}

// --- Interceptor de petición: adjunta el access token y marca con qué
// generación de sesión salió cada petición ---
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
  _generacion?: number
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  ;(config as RetryConfig)._generacion = generacionSesion
  return config
})

// --- Interceptor de respuesta: renueva el token cuando expira (401) ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined

    const esRutaDeAuth =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/logout')

    const debeRenovar =
      error.response?.status === 401 && original && !original._retry && !esRutaDeAuth

    if (!debeRenovar) {
      return Promise.reject(error)
    }

    // La generación con la que ESTA petición salió ya no es la actual: la
    // sesión cambió (logout y/o login nuevo) entre que salió y que llegó su
    // 401. Reintentarla significaría reenviarla con el access token de la
    // sesión nueva -- se descarta tal cual, sin intentar renovar nada.
    if (original._generacion !== generacionSesion) {
      return Promise.reject(error)
    }

    original._retry = true
    const generacionDeOrigen = original._generacion // nunca se reescribe

    try {
      const nuevoToken = await obtenerPromesaDeRenovacion()

      // Se vuelve a comprobar DESPUÉS de esperar el refresh, antes de
      // reenviar: la sesión pudo cambiar mientras la renovación estaba en
      // vuelo. generacionDeOrigen no se actualiza para "hacerla pasar" --
      // si ya no coincide con la actual, la petición original se descarta.
      if (generacionDeOrigen !== generacionSesion) {
        return Promise.reject(error)
      }

      original.headers.Authorization = `Bearer ${nuevoToken}`
      return api(original)
    } catch (refreshError) {
      if (refreshError instanceof RenovacionDescartadaError) {
        // Ya se resolvió por otra vía (logout y/o login nuevo) -- no hace
        // falta limpiar de nuevo ni redirigir.
        return Promise.reject(error)
      }
      clearTokens()
      // El refresh falló de verdad: la sesión se acabó. Redirigimos al login.
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    }
  },
)
