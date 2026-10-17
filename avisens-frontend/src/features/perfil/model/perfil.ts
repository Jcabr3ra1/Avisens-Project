export type PerfilCuenta = {
  id: number
  username: string
  nombre_completo: string
  email: string | null
  telefono: string | null
  rol: string
  organizacion: { id: number; nombre: string } | null
  fecha_creacion: string
  fecha_ultimo_login: string | null
  fecha_ultimo_cambio_password: string | null
}

export const LONGITUD_MINIMA = 8

export function errorDeCambio(actual: string, nueva: string, confirmacion: string): string | null {
  if (!actual) return 'Escribe tu contraseña actual.'
  if (nueva.length < LONGITUD_MINIMA) return `La nueva contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`
  if (nueva === actual) return 'La nueva contraseña debe ser distinta de la actual.'
  if (nueva !== confirmacion) return 'Las contraseñas nuevas no coinciden.'
  return null
}

export function fortaleza(password: string): { nivel: 0 | 1 | 2 | 3; etiqueta: string } {
  if (!password) return { nivel: 0, etiqueta: '' }
  let puntos = 0
  if (password.length >= LONGITUD_MINIMA) puntos += 1
  if (password.length >= 12) puntos += 1
  if (/[a-záéíóúñ]/.test(password) && /[A-ZÁÉÍÓÚÑ]/.test(password) && /\d/.test(password)) puntos += 1
  if (password.length < LONGITUD_MINIMA) return { nivel: 1, etiqueta: 'Muy corta' }
  if (puntos >= 3) return { nivel: 3, etiqueta: 'Fuerte' }
  if (puntos === 2) return { nivel: 2, etiqueta: 'Aceptable' }
  return { nivel: 1, etiqueta: 'Débil' }
}
