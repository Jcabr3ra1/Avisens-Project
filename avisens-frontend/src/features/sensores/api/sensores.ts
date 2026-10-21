import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type { GalponResumen } from '@shared/api/types'

export interface DispositivoResumen {
  id: number
  nombre: string
  codigo_topic: string
}

export interface Sensor {
  id: number
  codigo: string
  tipo: string
  canal?: string | null
  unidad_medida: string
  modelo: string | null
  fabricante: string | null
  // Float en el esquema, no Decimal: llegan como número. Ubican al sensor
  // dentro del galpón, y con eso se dibuja el plano.
  coordenada_x: number | null
  coordenada_y: number | null
  altura_metros: number | null
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
  canal?: string | null
  unidad_medida: string
  modelo?: string
  fabricante?: string
}

export type CrearSensorAutomaticoPayload = Omit<CrearSensorPayload, 'codigo' | 'unidad_medida'> &
  Partial<Pick<CrearSensorPayload, 'codigo' | 'unidad_medida'>>

// En edición todo es opcional; `estado` permite activar/desactivar.

export type ActualizarSensorPayload = Partial<CrearSensorPayload> & {
  estado?: string
  // null borra la fecha; omitirla la deja como está.
  fecha_instalacion?: string | null
}

// ─── Registro de los relés K1-K4 de un ESP32 ───────────────────────────────
// POST /sensores/reles (solo Administrador). Idempotente: el detalle por
// canal dice qué se creó, qué se asoció (registro antiguo REL-K), qué ya
// estaba y qué quedó en conflicto sin cambios.

export type ResultadoCanalRele = 'creado' | 'asociado' | 'existente' | 'conflicto'

export interface CanalRegistrado {
  canal: string
  nombre: string
  resultado: ResultadoCanalRele
  sensor_id: number | null
  codigo: string | null
  motivo: string | null
}

export interface RegistroReles {
  galpon_id: number
  dispositivo: DispositivoResumen
  completo: boolean
  resumen: { creados: number; asociados: number; existentes: number; conflictos: number }
  canales: CanalRegistrado[]
}

const RESULTADOS: readonly ResultadoCanalRele[] = ['creado', 'asociado', 'existente', 'conflicto']

// Un 2xx con otra forma (backend anterior, proxy) no puede presentarse como
// un registro hecho.
function comoRegistroReles(datos: unknown): RegistroReles {
  const r = datos as Partial<RegistroReles> | null
  if (
    !r || typeof r.completo !== 'boolean' || !Array.isArray(r.canales) ||
    !r.canales.every((c) => typeof c?.canal === 'string' && RESULTADOS.includes(c.resultado))
  ) {
    throw new Error('Respuesta inesperada del servidor al registrar los relés.')
  }
  return r as RegistroReles
}

export async function registrarReles(galponId: number, dispositivoId: number): Promise<RegistroReles> {
  const { data } = await api.post<unknown>('/sensores/reles', {
    galpon_id: galponId,
    dispositivo_id: dispositivoId,
  })
  return comoRegistroReles(data)
}

// Funciones del módulo `sensores` del backend (EP-08).
// Requieren sesión: el Admin gestiona todos; el Propietario, solo los sensores
// de galpones de sus propias granjas (el alcance se aplica en el servidor).

export async function listarSensores(): Promise<Sensor[]> {
  return listarTodasLasPaginas<Sensor>('/sensores')
}

export async function obtenerSensor(id: number): Promise<Sensor> {
  const { data } = await api.get<Sensor>(`/sensores/${id}`)
  return data
}

export async function crearSensor(payload: CrearSensorAutomaticoPayload): Promise<Sensor> {
  const { data } = await api.post<Sensor>('/sensores', payload)
  return data
}

export async function actualizarSensor(
  id: number,
  payload: ActualizarSensorPayload,
): Promise<Sensor> {
  const { data } = await api.patch<Sensor>(`/sensores/${id}`, payload)
  return data
}

// Activar: estado → 'activo'.
export async function activarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.patch<{ id: number; estado: string }>(
    `/sensores/${id}/activar`,
  )
  return data
}

// Desactivar: borrado suave, estado → 'inactivo' (conserva el historial).
export async function desactivarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.delete<{ id: number; estado: string }>(
    `/sensores/${id}`,
  )
  return data
}

// Sin historial se borra; con lecturas o alertas se retira y deja de aparecer.
export async function eliminarSensor(
  id: number,
): Promise<{ id: number; eliminado: boolean; retirado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean; retirado: boolean }>(
    `/sensores/${id}/permanente`,
  )
  return data
}
