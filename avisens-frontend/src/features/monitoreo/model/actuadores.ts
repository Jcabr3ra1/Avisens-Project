// actuadores.ts — Qué mostrar de cada relé controlable.
//
// Hay dos fuentes y no se mezclan:
// - El estado actual (modo y salida) sale del último informe del ESP32
//   (estados_actuadores), y solo vale si es reciente ("vigente").
// - La orden es historial: qué se pidió y qué respondió el ESP32 entonces.
//   Una orden "aplicada" de hace una hora no dice que el relé siga en manual.
import { estaEncendido, type SensorVista } from '../hooks/useMonitoreoAmbiental'
import type { EstadoOrden, EstadoRele, OrdenActuador } from '../api/ordenesActuadores'

// Igual que en el backend (esReleControlable): solo K1-K4 tienen modo manual
// en el firmware. Los motores también son "estado", pero no se controlan.
const PATRON_RELE_CONTROLABLE = /^REL-K[1-4]-/i

export function esReleControlable(sensor: Pick<SensorVista, 'esEstado' | 'codigo'>): boolean {
  return sensor.esEstado && PATRON_RELE_CONTROLABLE.test(sensor.codigo)
}

export function ordenEnCurso(orden: OrdenActuador | null | undefined): boolean {
  return orden?.estado === 'pendiente' || orden?.estado === 'enviada'
}

export const ESTADOS_FINALES: readonly EstadoOrden[] = ['aplicada', 'rechazada', 'revertida', 'expirada', 'incierta']

export type ModoVisible = 'automatico' | 'manual_remoto' | 'manual_local' | 'desconocido'

export type EstadoActualRele = {
  encendido: boolean | null
  modo: ModoVisible
  // true si hay un informe reciente del ESP32 sobre este relé.
  conectado: boolean
}

// Sin informe vigente no se afirma nada del modo: el ESP32 pudo volver solo
// a automático al perder contacto. Si nunca informó (firmware anterior sin
// estados_reles), la salida se toma de la lectura del relé, si es reciente.
export function estadoActualRele(
  sensor: Pick<SensorVista, 'valor' | 'estado'>,
  estado: EstadoRele | null | undefined,
): EstadoActualRele {
  if (estado) {
    return estado.vigente
      ? { encendido: estado.encendido, modo: estado.modo, conectado: true }
      : { encendido: null, modo: 'desconocido', conectado: false }
  }
  const lecturaReciente = sensor.valor !== null && sensor.estado !== 'offline' &&
    sensor.estado !== 'obsoleta' && sensor.estado !== 'lectura_no_disponible'
  return {
    encendido: lecturaReciente ? estaEncendido(sensor.valor as number) : null,
    modo: 'desconocido',
    conectado: lecturaReciente,
  }
}

// Precedencia al juntar órdenes de varias respuestas: gana la orden más
// nueva (id mayor) y, para la misma orden, la versión más reciente según el
// servidor (actualizada_en). Así una respuesta que salió antes de una
// confirmación y llegó después no la deshace.
export function fusionarOrdenes(
  actuales: Record<number, OrdenActuador>,
  nuevas: OrdenActuador[],
): Record<number, OrdenActuador> {
  const resultado = { ...actuales }
  for (const o of nuevas) {
    const previa = resultado[o.sensor_id]
    if (!previa || esMasReciente(o, previa)) resultado[o.sensor_id] = o
  }
  return resultado
}

function esMasReciente(a: OrdenActuador, b: OrdenActuador): boolean {
  if (a.id !== b.id) return a.id > b.id
  return new Date(a.actualizada_en).getTime() >= new Date(b.actualizada_en).getTime()
}

const TEXTO_ACCION = { encender: 'encender', apagar: 'apagar', automatico: 'volver a automático' } as const

// Mensaje del estado de la última orden, para mostrar junto al relé. Habla de
// la orden, no del relé: el estado actual va aparte.
export function textoOrden(orden: OrdenActuador): string {
  const accion = TEXTO_ACCION[orden.accion]
  switch (orden.estado) {
    case 'pendiente':
      return `Orden de ${accion} registrada · esperando al ESP32`
    case 'enviada':
      return `El ESP32 recibió la orden de ${accion} · esperando confirmación`
    case 'aplicada':
      return orden.accion === 'automatico'
        ? 'Última orden: volver a automático, confirmada por el ESP32'
        : `Última orden: ${accion}, confirmada por el ESP32`
    case 'rechazada':
      return `El ESP32 rechazó ${accion}: ${orden.motivo ?? 'sin motivo informado'}`
    case 'revertida':
      return `La orden de ${accion} ya no rige: ${orden.motivo ?? 'el ESP32 retomó el control'}`
    case 'expirada':
      return `Sin confirmación del ESP32: ${orden.motivo ?? 'la orden expiró'}`
    case 'incierta':
      // Ni "aplicada" ni "fallida": no se sabe, y así se dice.
      return `No confirmada: ${orden.motivo ?? 'el ESP32 se reinició y no se sabe si llegó a aplicarla'}`
  }
}

// La salida que se muestra es la que el ESP32 ordenó al pin del relé: con
// el hardware actual nada confirma que el relé conmutó ni que la carga
// funciona, así que nunca se presenta como un estado físico confirmado.
export function textoSalida(encendido: boolean | null): string {
  if (encendido === null) return 'Sin dato reciente'
  return encendido ? 'Salida ordenada: encendida' : 'Salida ordenada: apagada'
}

export const TEXTO_SIN_CONFIRMACION_FISICA =
  'Confirmación física: no disponible. El ESP32 informa la salida que ordenó al relé, no si el relé conmutó o la carga funciona.'

// Tono visual del mensaje, con las variantes de insignia que ya existen.
export function tonoOrden(estado: EstadoOrden): 'lectura_no_disponible' | 'optimo' | 'critico' | 'advertencia' {
  if (estado === 'pendiente' || estado === 'enviada') return 'lectura_no_disponible'
  if (estado === 'aplicada') return 'optimo'
  if (estado === 'rechazada') return 'critico'
  return 'advertencia'
}

export const ETIQUETA_MODO: Record<ModoVisible, string> = {
  automatico: 'Automático',
  manual_remoto: 'Manual (web)',
  manual_local: 'Manual (en el equipo)',
  desconocido: 'Sin dato reciente',
}
