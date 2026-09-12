import type { ConvertirProspectoPayload } from '../api/prospectos'
import type { ProspectoDetalle } from '../api/prospectos'

export interface FormularioConversion {
  nombre_completo: string
  cedula: string
  email: string
  telefono: string
  organizacion_nombre: string
  granja_nombre: string
  granja_municipio: string
  password: string
}

// Lo que el prospecto ya dio se trae tal cual; lo que falta se deja vacío para
// que el asesor lo pregunte. La gracia de convertir no es adivinar datos, es no
// tener que volver a teclear los que ya están.
//
// La cédula casi siempre viene vacía: el cuestionario no la pregunta, y no
// debería — se pide en la llamada, no en un chat.
export function prellenarDesde(prospecto: ProspectoDetalle): FormularioConversion {
  return {
    nombre_completo: prospecto.nombre ?? '',
    cedula: prospecto.documento ?? '',
    email: prospecto.email ?? '',
    // Solo un número marcable: una identidad de WhatsApp en el campo teléfono
    // de un usuario no sirve para nada.
    telefono: prospecto.telefono ?? '',
    organizacion_nombre: prospecto.nombre_granja?.trim() || nombreDeOrganizacion(prospecto.nombre),
    // Vacíos a propósito. El cuestionario preguntaba la granja y el municipio
    // en A5, A6 y A6B, y esas preguntas se retiraron en el recorte a nueve
    // pasos: hoy nada escribe `nombre_granja` ni `municipio`, y en producción
    // los tres prospectos los tienen en null. Prellenar de ahí sería una rama
    // que no se ejecuta nunca. Los escribe el asesor, que está al teléfono.
    granja_nombre: '',
    granja_municipio: '',
    password: '',
  }
}

// El backend usa «Organización de {nombre}» cuando no se le da uno. Se replica
// aquí para que el asesor vea de antemano cómo va a llamarse y pueda cambiarlo,
// en vez de descubrirlo después en el listado de organizaciones.
export function nombreDeOrganizacion(nombre: string | null): string {
  const limpio = nombre?.trim()
  return limpio ? `Organización de ${limpio}` : ''
}

export function errorDeConversion(form: FormularioConversion): string {
  if (!form.nombre_completo.trim()) return 'El nombre del propietario es obligatorio.'
  if (!form.cedula.trim()) return 'La cédula es obligatoria: pídesela al cliente.'
  if (!form.email.trim()) return 'El correo es obligatorio: con él entra al sistema.'
  if (!form.email.includes('@')) return 'Ese correo no parece válido.'
  // Sin granja el cliente no puede hacer nada: no hay galpones, ni lotes, ni
  // monitoreo, ni alertas. Convertir sin ella entrega una cuenta que no sirve
  // y que nadie descubre rota hasta que el cliente entra y no ve dónde pulsar.
  if (!form.granja_nombre.trim()) return 'El nombre de la granja es obligatorio: sin ella el cliente entra a un sistema vacío.'
  if (form.granja_nombre.trim().length < 2) return 'El nombre de la granja es demasiado corto.'
  if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  return ''
}

// La ruta de conversión no pide `rol_id`: el cliente que sale de un prospecto
// es siempre Propietario, y dejar que la pantalla eligiera el rol sería abrir
// la puerta a crear un administrador desde el CRM.
export function payloadDeConversion(
  form: FormularioConversion,
): ConvertirProspectoPayload {
  const payload: ConvertirProspectoPayload = {
    nombre_completo: form.nombre_completo.trim(),
    cedula: form.cedula.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password,
    granja_nombre: form.granja_nombre.trim(),
  }
  if (form.telefono.trim()) payload.telefono = form.telefono.trim()
  if (form.organizacion_nombre.trim()) {
    payload.organizacion_nombre = form.organizacion_nombre.trim()
  }
  if (form.granja_municipio.trim()) {
    payload.granja_municipio = form.granja_municipio.trim()
  }
  return payload
}


// Una contraseña que el asesor pueda dictar por teléfono sin equivocarse: sin
// caracteres que se confundan al oído ni al leerlos (l/1, O/0, I/i).
const SIN_AMBIGUOS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function contrasenaSugerida(largo = 12): string {
  const valores = new Uint32Array(largo)
  crypto.getRandomValues(valores)
  return Array.from(valores, (n) => SIN_AMBIGUOS[n % SIN_AMBIGUOS.length]).join('')
}

// El 409 de cédula o correo repetidos es el error más frecuente al convertir:
// es fácil que el asesor teclee una cédula que ya existe. El backend nombra el
// campo en el mensaje —«Ya existe un registro con ese valor en: cedula»— así que
// se extrae para señalarlo en vez de dejar al asesor releyendo el formulario
// entero buscando qué está mal.
export function campoDuplicado(mensaje: string): keyof FormularioConversion | null {
  const coincide = /ese valor en:\s*([a-z_]+)/i.exec(mensaje)
  if (!coincide) return null
  const campo = coincide[1].toLowerCase()
  if (campo === 'cedula') return 'cedula'
  if (campo === 'email' || campo === 'correo') return 'email'
  return null
}
