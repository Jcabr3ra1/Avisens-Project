export const PATRON_NOMBRE_PERSONA = /^(?=.*\p{L})[\p{L}\s.'-]+$/u
export const PATRON_NOMBRE_ENTIDAD = /^(?=.*\p{L})[\p{L}\p{N} .,'&()/#°%+-]+$/u
export const PATRON_TEXTO_SEGURO = /^[\p{L}\p{N} .,;:¡!¿?()/#%°+'"&_–—-]+$/u
export const PATRON_TEXTO_MULTILINEA = /^[\p{L}\p{N} \r\n.,;:¡!¿?()/#%°+'"&_–—-]+$/u
export const PATRON_CODIGO = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/
export const PATRON_NIT = /^\d{6,10}(-\d)?$/
export const PATRON_CEDULA = /^\d{6,10}$/
export const PATRON_TELEFONO = /^\+?\d{10,13}$/
export const PATRON_TELEFONO_PUBLICO = /^\+?\d{7,13}$/

export function validarNombrePersona(
  valor: string,
  etiqueta = 'El nombre',
  max = 120,
): string | null {
  const limpio = valor.trim()
  if (!limpio) return `${etiqueta} es obligatorio.`
  if (limpio.length < 2) return `${etiqueta} debe tener al menos 2 caracteres.`
  if (limpio.length > max) return `${etiqueta} no puede superar ${max} caracteres.`
  if (!PATRON_NOMBRE_PERSONA.test(limpio)) {
    return `${etiqueta} solo admite letras, espacios, puntos, guiones o apóstrofos.`
  }
  return null
}

export function validarNombreEntidad(
  valor: string,
  etiqueta = 'El nombre',
  opciones: { requerido?: boolean; max?: number } = {},
): string | null {
  const { requerido = true, max = 120 } = opciones
  const limpio = valor.trim()
  if (!limpio) return requerido ? `${etiqueta} es obligatorio.` : null
  if (limpio.length > max) return `${etiqueta} no puede superar ${max} caracteres.`
  if (!PATRON_NOMBRE_ENTIDAD.test(limpio)) {
    return `${etiqueta} debe incluir letras y no admite caracteres especiales raros ni emojis.`
  }
  return null
}

export function validarTextoSeguro(
  valor: string,
  etiqueta = 'El campo',
  opciones: { requerido?: boolean; max?: number; multilinea?: boolean; exigirLetras?: boolean } = {},
): string | null {
  const { requerido = false, max = 500, multilinea = false, exigirLetras = false } = opciones
  const limpio = valor.trim()
  if (!limpio) return requerido ? `${etiqueta} es obligatorio.` : null
  if (limpio.length > max) return `${etiqueta} no puede superar ${max} caracteres.`
  const patron = multilinea ? PATRON_TEXTO_MULTILINEA : PATRON_TEXTO_SEGURO
  if (!patron.test(limpio)) {
    return `${etiqueta} contiene caracteres no permitidos (como <, >, símbolos raros o emojis).`
  }
  if (exigirLetras && !/\p{L}/u.test(limpio)) {
    return `${etiqueta} debe incluir palabras descriptivas, no solo números o símbolos.`
  }
  return null
}

export function validarCodigo(
  valor: string,
  etiqueta = 'El código',
  opciones: { requerido?: boolean; max?: number } = {},
): string | null {
  const { requerido = true, max = 60 } = opciones
  const limpio = valor.trim()
  if (!limpio) return requerido ? `${etiqueta} es obligatorio.` : null
  if (limpio.length > max) return `${etiqueta} no puede superar ${max} caracteres.`
  if (!PATRON_CODIGO.test(limpio)) {
    return `${etiqueta} solo admite letras sin tildes, números y los símbolos . _ - / :.`
  }
  return null
}

export function validarNit(valor: string, requerido = false): string | null {
  if (!valor.trim()) return requerido ? 'El NIT es obligatorio.' : null
  const limpio = valor.trim().replace(/[.\s]/g, '')
  if (!PATRON_NIT.test(limpio)) {
    return 'El NIT debe tener entre 6 y 10 dígitos (ej.: 900123456-7).'
  }
  return null
}

export function validarTelefonoPublico(valor: string, requerido = false): string | null {
  if (!valor.trim()) return requerido ? 'El teléfono es obligatorio.' : null
  const limpio = valor.replace(/[\s().-]/g, '')
  if (!PATRON_TELEFONO_PUBLICO.test(limpio)) {
    return 'Escribe un teléfono válido de 7 a 13 dígitos.'
  }
  return null
}

export function esUrlHttpSegura(valor: string | null | undefined): boolean {
  if (!valor) return false
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validarUrlHttp(valor: string, requerido = false): string | null {
  const limpio = valor.trim()
  if (!limpio) return requerido ? 'Ingresa un enlace válido.' : null
  if (limpio.length > 500) return 'El enlace no puede superar 500 caracteres.'
  if (!esUrlHttpSegura(limpio)) {
    return 'El enlace debe iniciar por http:// o https://.'
  }
  return null
}
