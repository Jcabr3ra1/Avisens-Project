import type { CrearUsuarioPayload } from '@shared/api'

// Reglas del formulario de usuarios (QA 17-nov). Son las mismas del backend
// (create-usuario.dto.ts): la pantalla avisa en el campo antes de enviar y el
// servidor protege a quien llame la API directamente.

export type CampoValidado = 'cedula' | 'telefono' | 'email'
export type ErroresUsuario = Partial<Record<CampoValidado, string>>

// Cédula colombiana: solo dígitos, de 6 a 10.
export const CEDULA_VALIDA = /^\d{6,10}$/
// Celular o fijo con indicativo: 10 dígitos como mínimo, «+57» opcional.
export const TELEFONO_VALIDO = /^\+?\d{10,13}$/
// Algo@algo.dominio, sin espacios. El backend usa IsEmail, que es más estricto.
export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Espacios, guiones y paréntesis son formato, no dígitos: «300 123 4567».
export function limpiarTelefono(valor: string): string {
  return valor.replace(/[\s\-()]/g, '')
}

export function erroresDeUsuario(form: Pick<CrearUsuarioPayload, 'cedula' | 'telefono' | 'email'>): ErroresUsuario {
  const errores: ErroresUsuario = {}

  const cedula = form.cedula.trim()
  if (!cedula) errores.cedula = 'Escribe la cédula.'
  else if (!/^\d+$/.test(cedula)) errores.cedula = 'La cédula solo lleva números, sin letras, puntos ni símbolos.'
  else if (!CEDULA_VALIDA.test(cedula)) errores.cedula = 'La cédula debe tener de 6 a 10 dígitos.'

  const telefono = limpiarTelefono(form.telefono ?? '')
  if (telefono && !TELEFONO_VALIDO.test(telefono)) {
    errores.telefono = /^\+?\d+$/.test(telefono)
      ? 'El teléfono debe tener al menos 10 dígitos.'
      : 'El teléfono solo lleva números.'
  }

  const email = (form.email ?? '').trim()
  if (email && !CORREO_VALIDO.test(email)) {
    errores.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.'
  }

  return errores
}
