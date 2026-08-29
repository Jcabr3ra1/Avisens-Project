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

export interface DispositivoResumen {
  id: number
  nombre: string
  codigo_topic: string
}

export interface Sensor {
  id: number
  codigo: string
  tipo: string
  unidad_medida: string
  modelo: string | null
  fabricante: string | null
  // Coordenadas y alturas son Decimal en el MER; Prisma las serializa como
  // string. No las mostramos en esta pantalla de prueba, pero las tipamos.
  coordenada_x: string | null
  coordenada_y: string | null
  altura_metros: string | null
  fecha_instalacion: string | null
  ultima_calibracion: string | null
  proxima_calibracion: string | null
  estado: string
  galpon: GalponResumen
  dispositivo: DispositivoResumen
}

// El sensor guarda galpon_id Y dispositivo_id; el backend valida que el
// dispositivo pertenezca al galpón (coherencia), así que ambos son obligatorios.
export interface CrearSensorPayload {
  galpon_id: number
  dispositivo_id: number
  codigo: string
  tipo: string
  unidad_medida: string
  modelo?: string
  fabricante?: string
}

// En edición todo es opcional; `estado` permite activar/desactivar.
export type ActualizarSensorPayload = Partial<CrearSensorPayload> & {
  estado?: string
}

// ----- Mediciones -----

export interface Medicion {
  // `id` es BigInt en el backend, por eso llega como string (no cabe en number).
  id: string
  sensor_id: number
  fecha_hora: string
  valor: number
  calidad: string
}

// Filtros de GET /mediciones. Todo opcional; el backend pagina y ordena por
// fecha_hora descendente (lo más reciente primero).
export interface MedicionesQuery {
  sensor_id?: number
  desde?: string
  hasta?: string
  page?: number
  limit?: number
}
