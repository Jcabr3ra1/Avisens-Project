// Tipos de las peticiones y respuestas de la API de Avisens.
// Coinciden con los DTOs y los `select` del backend NestJS.

// Forma estándar de un listado paginado del backend: { data, meta }. TODAS las
// rutas de listado (usuarios, granjas, galpones, sensores, proveedores…)
// devuelven esto — nunca un array plano. Al consumirlas hay que desempaquetar
// `.data`, o el componente reventará al hacer `.filter(...)` sobre el objeto.
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

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
  organizacion_id: number | null
  rol: RolResumen
  organizacion: { id: number; nombre: string } | null
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

export interface LoginSesionResponse {
  requiere_cambio_password: false
  access_token: string
  refresh_token: string
  usuario: UsuarioSesion
}

export interface LoginCambioPasswordResponse {
  requiere_cambio_password: true
  cambio_password_token: string
}

export type LoginResponse = LoginSesionResponse | LoginCambioPasswordResponse

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
  organizacion_id?: number
  organizacion_nombre?: string
}

// En una edición todos los campos son opcionales: solo se envía lo que cambia.
// `activo` permite reactivar o desactivar la cuenta.
export type ActualizarUsuarioPayload = Partial<
  Omit<CrearUsuarioPayload, 'password' | 'organizacion_id' | 'organizacion_nombre'>
> & {
  activo?: boolean
}

// ----- Sensores -----

// Galpón y dispositivo tal como el backend los anida en cada sensor
// (SENSOR_SELECT sube dos niveles: sensor → galpón → granja).
export interface GalponResumen {
  id: number
  nombre: string
  granja: { id: number; propietario_id: number }
}

// ----- Mediciones -----

