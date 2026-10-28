import { api } from '@shared/api/client'

export type AccionOrden = 'encender' | 'apagar' | 'automatico'

export type EstadoOrden =
  | 'pendiente'
  | 'enviada'
  | 'aplicada'
  | 'rechazada'
  | 'revertida'
  | 'expirada'
  // El ESP32 se reinició sin confirmarla: no se sabe si llegó a aplicarse.
  | 'incierta'

export interface OrdenActuador {
  id: number
  sensor_id: number
  dispositivo_id: number
  galpon_id: number
  accion: AccionOrden
  estado: EstadoOrden
  // Salida que el ESP32 dice haber ordenado al relé; null mientras no
  // conteste. No es una confirmación física: no hay sensor de realimentación.
  estado_real: boolean | null
  motivo: string | null
  fecha_creacion: string
  fecha_envio: string | null
  fecha_resultado: string | null
  // Versión de la fila en el servidor: cambia en cada transición.
  actualizada_en: string
  sensor: { codigo: string; tipo: string }
  // null si el usuario que la dio fue eliminado.
  usuario: { id: number; nombre_completo: string } | null
}

export type ModoRele = 'automatico' | 'manual_remoto' | 'manual_local'

// Lo que el ESP32 informó del relé en su último envío. `vigente` lo calcula el
// servidor con su reloj: si es false, el informe es viejo y no describe el
// relé de ahora.
export interface EstadoRele {
  sensor_id: number
  modo: ModoRele
  // Salida ordenada al pin por el ESP32, no el estado físico del relé.
  encendido: boolean
  orden_id: number | null
  reportado_en: string
  vigente: boolean
  // Con el hardware actual siempre 'no_disponible': nada confirma que el relé
  // conmutó ni que la carga funciona.
  confirmacion_fisica: 'no_disponible'
}

export interface UltimasOrdenes {
  ordenes: OrdenActuador[]
  reles: EstadoRele[]
  // Hora del servidor (ms) en que armó la respuesta; null si no vino. Con
  // ella se sabe qué edad tenía cada informe al responder (ver vencimientoEstado).
  generadoEn: number | null
}

const ESTADOS: readonly EstadoOrden[] = ['pendiente', 'enviada', 'aplicada', 'rechazada', 'revertida', 'expirada', 'incierta']

// Un 2xx con otra forma (proxy, versión vieja del backend) no puede
// tomarse como una orden: la interfaz mostraría un estado inventado.
function comoOrden(datos: unknown): OrdenActuador {
  const o = datos as Partial<OrdenActuador> | null
  if (
    !o || typeof o.id !== 'number' || typeof o.sensor_id !== 'number' ||
    typeof o.actualizada_en !== 'string' || !ESTADOS.includes(o.estado as EstadoOrden)
  ) {
    throw new Error('Respuesta inesperada del servidor al consultar la orden.')
  }
  return o as OrdenActuador
}

// Crea la orden. Que responda 201 NO significa que el relé cambió: queda
// "pendiente" hasta que el ESP32 la confirme.
export async function crearOrden(sensorId: number, accion: AccionOrden): Promise<OrdenActuador> {
  const { data } = await api.post<unknown>('/ordenes-actuadores', { sensor_id: sensorId, accion })
  return comoOrden(data)
}

export async function obtenerOrden(id: number): Promise<OrdenActuador> {
  const { data } = await api.get<unknown>(`/ordenes-actuadores/${id}`)
  return comoOrden(data)
}

const MODOS: readonly ModoRele[] = ['automatico', 'manual_remoto', 'manual_local']

function comoEstadoRele(datos: unknown): EstadoRele {
  const e = datos as Partial<EstadoRele> | null
  if (
    !e || typeof e.sensor_id !== 'number' || typeof e.encendido !== 'boolean' ||
    typeof e.vigente !== 'boolean' || !MODOS.includes(e.modo as ModoRele)
  ) {
    throw new Error('Respuesta inesperada del servidor sobre el estado de los relés.')
  }
  // Nunca se acepta otra cosa que "no disponible": sin un sensor de
  // realimentación, un valor distinto no podría ser cierto.
  return { ...(e as EstadoRele), confirmacion_fisica: 'no_disponible' }
}

export async function listarUltimasOrdenes(galponId: number): Promise<UltimasOrdenes> {
  const { data } = await api.get<{ ordenes?: unknown; reles?: unknown; generado_en?: unknown }>(
    '/ordenes-actuadores/ultimas',
    { params: { galpon_id: galponId } },
  )
  if (!Array.isArray(data?.ordenes) || !Array.isArray(data?.reles)) {
    throw new Error('Respuesta inesperada del servidor al listar las órdenes.')
  }
  const generadoEn = typeof data.generado_en === 'string' ? Date.parse(data.generado_en) : Number.NaN
  return {
    ordenes: data.ordenes.map(comoOrden),
    reles: data.reles.map(comoEstadoRele),
    generadoEn: Number.isNaN(generadoEn) ? null : generadoEn,
  }
}
