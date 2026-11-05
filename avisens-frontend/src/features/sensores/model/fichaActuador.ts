// fichaActuador.ts — Datos editables de la ficha de un relé y qué se envía.
//
// Solo viajan los campos que cambiaron, y nunca los de identidad física
// (ESP32, galpón, canal, código, unidad): editar el fabricante no puede
// desconectar el relé.
import type { ActualizarSensorPayload, Sensor } from '../api/sensores'

export const ESTADOS_ADMINISTRATIVOS = ['activo', 'inactivo', 'mantenimiento', 'falla'] as const

export type DatosFicha = {
  nombre: string
  modelo: string
  fabricante: string
  // AAAA-MM-DD o '' si no se conoce.
  fecha_instalacion: string
  estado: string
}

// La fecha llega como "2026-10-01T00:00:00.000Z" (columna DATE): se toma la
// parte de la fecha, sin pasar por la zona horaria del navegador.
function soloFecha(valor: string | null): string {
  return valor ? valor.slice(0, 10) : ''
}

export function datosFicha(sensor: Sensor): DatosFicha {
  return {
    nombre: sensor.tipo,
    modelo: sensor.modelo ?? '',
    fabricante: sensor.fabricante ?? '',
    fecha_instalacion: soloFecha(sensor.fecha_instalacion),
    estado: sensor.estado,
  }
}

export function validarFicha(form: DatosFicha): string | null {
  if (!form.nombre.trim()) return 'El nombre del actuador es obligatorio.'
  if (form.nombre.trim().length > 80) return 'El nombre no puede pasar de 80 caracteres.'
  if (form.fecha_instalacion && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_instalacion)) {
    return 'La fecha de instalación no es válida.'
  }
  if (!(ESTADOS_ADMINISTRATIVOS as readonly string[]).includes(form.estado)) {
    return 'Elige un estado administrativo válido.'
  }
  return null
}

export function payloadFicha(sensor: Sensor, form: DatosFicha): ActualizarSensorPayload {
  const antes = datosFicha(sensor)
  const payload: ActualizarSensorPayload = {}
  const nombre = form.nombre.trim()
  if (nombre !== antes.nombre) payload.tipo = nombre
  // Vacío = «bórralo»: el backend guarda cadena vacía en modelo/fabricante,
  // igual que el formulario de sensores.
  if (form.modelo.trim() !== antes.modelo) payload.modelo = form.modelo.trim()
  if (form.fabricante.trim() !== antes.fabricante) payload.fabricante = form.fabricante.trim()
  if (form.fecha_instalacion !== antes.fecha_instalacion) {
    payload.fecha_instalacion = form.fecha_instalacion || null
  }
  if (form.estado !== antes.estado) payload.estado = form.estado
  return payload
}
