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

// Se reutilizan los datos que el prospecto ya entregó; los que el chatbot no
// pide se dejan para que el asesor los confirme durante la llamada.
export function prellenarDesde(prospecto: ProspectoDetalle): FormularioConversion {
  return {
    nombre_completo: prospecto.nombre ?? '',
    cedula: prospecto.documento ?? '',
    email: prospecto.email ?? '',
    telefono: prospecto.telefono ?? '',
    organizacion_nombre: prospecto.nombre_granja?.trim() || nombreDeOrganizacion(prospecto.nombre),
    // La granja y el municipio ya no los recoge el chatbot: no se inventan al
    // convertir, porque el asesor debe confirmar el dato real.
    granja_nombre: '',
    granja_municipio: '',
    password: '',
  }
}

// Replica el nombre que generará el backend cuando no se proporciona una
// organización, para que el asesor pueda revisarlo antes de crearla.
export function nombreDeOrganizacion(nombre: string | null): string {
  const limpio = nombre?.trim()
  return limpio ? `Organización de ${limpio}` : ''
}

export function errorDeConversion(form: FormularioConversion): string {
  if (!form.nombre_completo.trim()) return 'El nombre del propietario es obligatorio.'
  if (!form.cedula.trim()) return 'La cédula es obligatoria: pídesela al cliente.'
  if (!form.granja_nombre.trim()) return 'El nombre de la granja es obligatorio: sin ella el cliente entra a un sistema vacío.'
  if (form.granja_nombre.trim().length < 2) return 'El nombre de la granja es demasiado corto.'
  if (!form.email.trim()) return 'El correo es obligatorio: con él entra al sistema.'
  if (!correoValido(form.email)) return 'Ese correo no parece válido.'
  if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  return ''
}

export function primerCampoInvalido(
  form: FormularioConversion,
): keyof FormularioConversion | null {
  if (!form.nombre_completo.trim()) return 'nombre_completo'
  if (!form.cedula.trim()) return 'cedula'
  if (!form.granja_nombre.trim() || form.granja_nombre.trim().length < 2) {
    return 'granja_nombre'
  }
  if (!form.email.trim() || !correoValido(form.email)) return 'email'
  if (form.password.length < 8) return 'password'
  return null
}

function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

// La conversión siempre crea un Propietario. El formulario no expone ni envía
// un rol para evitar crear por accidente una cuenta administrativa.
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

const SIN_AMBIGUOS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function contrasenaSugerida(largo = 12): string {
  const valores = new Uint32Array(largo)
  crypto.getRandomValues(valores)
  return Array.from(valores, (n) => SIN_AMBIGUOS[n % SIN_AMBIGUOS.length]).join('')
}

const CAMPOS: readonly string[] = [
  'nombre_completo',
  'cedula',
  'email',
  'telefono',
  'organizacion_nombre',
  'granja_nombre',
  'granja_municipio',
  'password',
]

// El backend puede responder un 409 por duplicado o un 400 de class-validator.
// Ambos formatos se traducen al campo que el asesor debe corregir.
export function campoSenalado(mensaje: string): keyof FormularioConversion | null {
  const duplicado = /ese valor en:\s*([a-z_]+)/i.exec(mensaje)
  if (duplicado) {
    const campo = duplicado[1].toLowerCase()
    if (campo === 'cedula') return 'cedula'
    if (campo === 'email' || campo === 'correo') return 'email'
    return null
  }

  for (const tramo of mensaje.split(',')) {
    const nombrado = /^\s*([a-z_]+)\s+(?:must|should|has|is)\b/i.exec(tramo)
    if (nombrado && CAMPOS.includes(nombrado[1].toLowerCase())) {
      return nombrado[1].toLowerCase() as keyof FormularioConversion
    }
  }
  return null
}
