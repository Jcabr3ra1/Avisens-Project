import type { CrearUsuarioPayload } from '@shared/api'
import { validarNombreEntidad, validarNombrePersona } from '@shared/utils/validacion'

// Reglas del formulario de usuarios (QA 17-nov). Son las mismas del backend
// (create-usuario.dto.ts): la pantalla avisa en el campo antes de enviar y el
// servidor protege a quien llame la API directamente.

export type CampoValidado = 'nombre_completo' | 'organizacion_nombre' | 'cedula' | 'telefono' | 'email'
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

export function erroresDeUsuario(
  form: Pick<CrearUsuarioPayload, 'cedula' | 'telefono' | 'email'> &
    Partial<Pick<CrearUsuarioPayload, 'nombre_completo' | 'organizacion_nombre'>>,
): ErroresUsuario {
  const errores: ErroresUsuario = {}

  if (form.nombre_completo !== undefined) {
    const errorNombre = validarNombrePersona(form.nombre_completo, 'El nombre completo', 120)
    if (errorNombre) errores.nombre_completo = errorNombre
  }

  if (form.organizacion_nombre) {
    const errorOrg = validarNombreEntidad(form.organizacion_nombre, 'El nombre de la organización', {
      requerido: false,
      max: 150,
    })
    if (errorOrg) errores.organizacion_nombre = errorOrg
  }

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
