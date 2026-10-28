// actuadores.ts — Qué mostrar de cada relé controlable.
//
// Hay dos fuentes y no se mezclan:
// - El estado actual (modo y salida) sale del último informe del ESP32
//   (estados_actuadores), y solo vale si es reciente ("vigente").
// - La orden es historial: qué se pidió y qué respondió el ESP32 entonces.
//   Una orden "aplicada" de hace una hora no dice que el relé siga en manual.
import { estaEncendido, type SensorVista } from '../hooks/useMonitoreoAmbiental'
import type { AccionOrden, EstadoOrden, EstadoRele, OrdenActuador } from '../api/ordenesActuadores'
import { esReleControlable as esReleControlableBase } from '@features/sensores/model/reles'

// Igual que en el backend (esReleControlable): solo K1-K4 tienen modo manual
// en el firmware. Los motores también son "estado", pero no se controlan. La
// regla vive con la identidad de los relés: canal o, si es antiguo, código.
export function esReleControlable(sensor: Pick<SensorVista, 'esEstado' | 'codigo' | 'canal'>): boolean {
  return esReleControlableBase(sensor)
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

// Con un informe vigente y sin otra orden en curso se pueden pedir cambios.
// Sin informe vigente no se sabe en qué está el relé: los botones se bloquean.
export function puedeEnviarOrden(actual: EstadoActualRele, enCurso: boolean): boolean {
  return actual.conectado && !enCurso
}

// Qué botón se marca como activo: el que corresponde a lo que el ESP32
// informó (estado vigente), nunca al que se pulsó. Manual por la web
// encendido → Encender; apagado → Apagar; automático → Automático. En manual
// local (serial) o sin dato vigente ninguno lo es: la web no gobierna ese
// relé, o no se sabe en qué está.
export function opcionActiva(actual: EstadoActualRele): AccionOrden | null {
  if (!actual.conectado) return null
  if (actual.modo === 'automatico') return 'automatico'
  if (actual.modo === 'manual_remoto' && actual.encendido !== null) {
    return actual.encendido ? 'encender' : 'apagar'
  }
  return null
}

// La acción pedida que todavía espera al ESP32. Se muestra aparte de la
// activa: pedida no es aplicada.
export function opcionSolicitada(orden: OrdenActuador | null | undefined): AccionOrden | null {
  return orden && ordenEnCurso(orden) ? orden.accion : null
}

// ─── Vigencia del estado en la pantalla ─────────────────────────────────
// El servidor calcula `vigente` al responder, pero esa respuesta envejece en
// la pantalla: si la consulta siguiente falla (sin red, backend caído), el
// último estado no puede seguir presentándose como actual.

// Igual que EN_LINEA_SEGUNDOS del backend: un informe del ESP32 de más de
// 30 s ya no describe el relé de ahora.
export const VIGENCIA_ESTADO_MS = 30_000

export type RecepcionEstados = {
  // Hora local en que SALIÓ la consulta. El servidor respondió después, así
  // que contar desde aquí nunca subestima la edad del informe, aunque la
  // respuesta tarde en llegar y aunque los relojes no coincidan.
  consultadaEn: number
  // Hora del servidor al responder (generado_en); null si no vino.
  generadoEn: number | null
}

export type EstadosRecibidos = {
  reles: Record<number, EstadoRele>
  recepcion: RecepcionEstados | null
  // Número de la consulta que los trajo: la respuesta de una consulta
  // anterior que llega tarde no los reemplaza.
  consulta: number
}

export const SIN_ESTADOS: EstadosRecibidos = { reles: {}, recepcion: null, consulta: 0 }

// Solo una respuesta correcta llega aquí: una consulta fallida no renueva
// nada, y el estado anterior sigue envejeciendo.
export function aplicarRespuestaEstados(
  actuales: EstadosRecibidos,
  consulta: number,
  reles: EstadoRele[],
  recepcion: RecepcionEstados,
): EstadosRecibidos {
  if (consulta <= actuales.consulta) return actuales
  return { reles: Object.fromEntries(reles.map((e) => [e.sensor_id, e])), recepcion, consulta }
}

// Hora local hasta la que el informe sigue vigente, o null si ya no lo era al
// responder. Su edad al responder (generado_en - reportado_en, ambas del
// reloj del servidor) se descuenta de los 30 s.
export function vencimientoEstado(estado: EstadoRele, recepcion: RecepcionEstados): number | null {
  if (!estado.vigente) return null
  let edadAlResponder = 0
  if (recepcion.generadoEn !== null) {
    const reportado = Date.parse(estado.reportado_en)
    if (Number.isNaN(reportado)) return null
    edadAlResponder = Math.max(0, recepcion.generadoEn - reportado)
  }
  return recepcion.consultadaEn + VIGENCIA_ESTADO_MS - edadAlResponder
}

// Los estados recibidos con `vigente` recalculado para este momento.
export function estadosVigentes(recibidos: EstadosRecibidos, ahora: number): Record<number, EstadoRele> {
  const { recepcion } = recibidos
  const resultado: Record<number, EstadoRele> = {}
  for (const e of Object.values(recibidos.reles)) {
    const vence = recepcion ? vencimientoEstado(e, recepcion) : null
    resultado[e.sensor_id] = { ...e, vigente: vence !== null && ahora <= vence }
  }
  return resultado
}

// Próximo momento en que un estado hoy vigente deja de serlo (para volver a
// pintar justo entonces), o null si no queda ninguno por vencer.
export function proximoVencimiento(recibidos: EstadosRecibidos, ahora: number): number | null {
  const { recepcion } = recibidos
  if (!recepcion) return null
  let proximo: number | null = null
  for (const e of Object.values(recibidos.reles)) {
    const vence = vencimientoEstado(e, recepcion)
    if (vence !== null && vence >= ahora && (proximo === null || vence < proximo)) proximo = vence
  }
  return proximo
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
