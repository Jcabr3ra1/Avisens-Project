import {
  errorDeConversion,
  primerCampoInvalido,
  type FormularioConversion,
} from './conversion'

export type PasoConversion = 'propietario' | 'granja' | 'acceso' | 'confirmar'

export const PASOS: Array<{ id: PasoConversion; titulo: string; pregunta: string; descripcion: string }> = [
  { id: 'propietario', titulo: 'Propietario', pregunta: '¿Quién es el propietario?', descripcion: 'La persona dueña de la cuenta. Confirma sus datos en la llamada.' },
  { id: 'granja', titulo: 'Granja', pregunta: '¿Dónde está su granja?', descripcion: 'Su empresa y la finca donde instalaremos Avisens.' },
  { id: 'acceso', titulo: 'Acceso', pregunta: '¿Cómo entrará a Avisens?', descripcion: 'Su usuario y una contraseña para el primer ingreso.' },
  { id: 'confirmar', titulo: 'Confirmar', pregunta: 'Revisa y crea la cuenta', descripcion: 'Puedes volver a cualquier paso antes de confirmar.' },
]

export const PASO_DE_CAMPO: Record<keyof FormularioConversion, PasoConversion> = {
  nombre_completo: 'propietario',
  cedula: 'propietario',
  telefono: 'propietario',
  organizacion_nombre: 'granja',
  granja_nombre: 'granja',
  granja_municipio: 'granja',
  username: 'acceso',
  email: 'acceso',
  password: 'acceso',
}

function indiceDe(paso: PasoConversion): number {
  return PASOS.findIndex((item) => item.id === paso)
}

export function errorDelPaso(form: FormularioConversion, paso: PasoConversion): { mensaje: string; campo: keyof FormularioConversion } | null {
  const campo = primerCampoInvalido(form)
  if (!campo) return null
  if (indiceDe(PASO_DE_CAMPO[campo]) > indiceDe(paso)) return null
  return { mensaje: errorDeConversion(form), campo }
}

const PALABRAS_SIN_PESO = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y'])

export function usuarioSugerido(nombre: string): string {
  const partes = nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .map((parte) => parte.replace(/[^a-z0-9]/g, ''))
    .filter((parte) => parte && !PALABRAS_SIN_PESO.has(parte))
  if (partes.length === 0) return ''
  const base = partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : partes[0]
  const recortado = base.slice(0, 30).replace(/[._-]+$/, '')
  return recortado.length >= 3 ? recortado : `${recortado}${'avs'.slice(0, 3 - recortado.length)}`
}
