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

export interface CrearSensorPayload {
  galpon_id: number
  dispositivo_id: number
  codigo: string
  tipo: string
  canal?: string | null
  unidad_medida: string
  modelo?: string
  fabricante?: string
  coordenada_x?: number | null
  coordenada_y?: number | null
  altura_metros?: number | null
}

export type CrearSensorAutomaticoPayload = Omit<CrearSensorPayload, 'codigo' | 'unidad_medida'> &
  Partial<Pick<CrearSensorPayload, 'codigo' | 'unidad_medida'>>

export type ActualizarSensorPayload = Partial<CrearSensorPayload> & {
  estado?: string
  fecha_instalacion?: string | null
}

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

export async function activarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.patch<{ id: number; estado: string }>(
    `/sensores/${id}/activar`,
  )
  return data
}

export async function desactivarSensor(
  id: number,
): Promise<{ id: number; estado: string }> {
  const { data } = await api.delete<{ id: number; estado: string }>(
    `/sensores/${id}`,
  )
  return data
}

export async function eliminarSensor(
  id: number,
): Promise<{ id: number; eliminado: boolean; retirado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean; retirado: boolean }>(
    `/sensores/${id}/permanente`,
  )
  return data
}