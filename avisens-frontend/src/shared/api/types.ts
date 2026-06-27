// Tipos de las peticiones y respuestas de la API de Avisens.
// Coinciden con los DTOs y los `select` del backend NestJS.

export interface RolResumen {
  id: number
  nombre: string
}

export interface Usuario {
  id: number
  nombre_completo: string
  email: string
  cedula: string
  telefono: string | null
  activo: boolean
  fecha_creacion: string
  rol: RolResumen
}

// ----- Auth -----

export interface LoginPayload {
  email: string
  password: string
}

export interface UsuarioSesion {
  id: number
  nombre: string
  email: string
  rol: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  usuario: UsuarioSesion
}

export interface TokensResponse {
  access_token: string
  refresh_token: string
}

// ----- Usuarios -----

export interface CrearUsuarioPayload {
  nombre_completo: string
  cedula: string
  email: string
  password: string
  telefono?: string
  rol_id: number
}

// En una edición todos los campos son opcionales: solo se envía lo que cambia.
// `activo` permite reactivar o desactivar la cuenta.
export type ActualizarUsuarioPayload = Partial<CrearUsuarioPayload> & {
  activo?: boolean
}
