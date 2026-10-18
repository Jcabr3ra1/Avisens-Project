import type { Organizacion } from '../api/organizaciones'

// Una organización es un cliente de Avisens: la empresa que contrata el
// sistema. De ella cuelgan sus usuarios y sus granjas.

export const DIAS_SIN_ACTIVIDAD = 7

export type ActividadOrganizacion = { tono: 'reciente' | 'inactiva' | 'nunca'; texto: string }

export function actividadDe(organizacion: Pick<Organizacion, 'ultima_actividad'>, ahora: Date = new Date()): ActividadOrganizacion {
  if (!organizacion.ultima_actividad) return { tono: 'nunca', texto: 'Nadie ha ingresado aún' }
  const dias = Math.floor((ahora.getTime() - new Date(organizacion.ultima_actividad).getTime()) / 86_400_000)
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
  return dias >= DIAS_SIN_ACTIVIDAD
    ? { tono: 'inactiva', texto: `Sin actividad: último ingreso ${cuando}` }
    : { tono: 'reciente', texto: `Último ingreso ${cuando}` }
}

export interface ResumenOrganizaciones {
  total: number
  activas: number
  sinActividad: number
  granjas: number
  usuarios: number
}

export function resumirOrganizaciones(
  organizaciones: Organizacion[],
): ResumenOrganizaciones {
  return {
    total: organizaciones.length,
    activas: organizaciones.filter((item) => item.activa).length,
    sinActividad: organizaciones.filter((item) => item.activa && actividadDe(item).tono !== 'reciente').length,
    granjas: organizaciones.reduce((suma, item) => suma + item._count.granjas, 0),
    usuarios: organizaciones.reduce((suma, item) => suma + item._count.usuarios, 0),
  }
}

export function etiquetaPlan(plan: string): string {
  const limpio = plan.trim()
  if (!limpio) return 'Sin plan'
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

// El backend guarda `plan` como texto libre, así que se normaliza para
// agrupar: 'Free', 'free ' y 'FREE' son el mismo plan.
export function normalizarPlan(plan: string): string {
  return plan.trim().toLowerCase()
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

export type FiltroEstado = 'todas' | 'activas' | 'suspendidas'

export type OrdenOrganizaciones = 'nombre-asc' | 'nombre-desc' | 'granjas' | 'personas' | 'recientes'

export interface CriteriosOrganizaciones {
  texto: string
  estado: FiltroEstado
  orden: OrdenOrganizaciones
}

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

const compararNombre = (a: Organizacion, b: Organizacion) =>
  a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })

export function filtrarOrganizaciones(
  organizaciones: Organizacion[],
  { texto, estado, orden }: CriteriosOrganizaciones,
): Organizacion[] {
  const buscado = normalizarTexto(texto)
  const filtradas = organizaciones.filter((item) => {
    if (estado === 'activas' && !item.activa) return false
    if (estado === 'suspendidas' && item.activa) return false
    if (!buscado) return true
    return normalizarTexto(item.nombre).includes(buscado) || normalizarTexto(item.nit ?? '').includes(buscado)
  })
  const comparadores: Record<OrdenOrganizaciones, (a: Organizacion, b: Organizacion) => number> = {
    'nombre-asc': compararNombre,
    'nombre-desc': (a, b) => compararNombre(b, a),
    granjas: (a, b) => b._count.granjas - a._count.granjas || compararNombre(a, b),
    personas: (a, b) => b._count.usuarios - a._count.usuarios || compararNombre(a, b),
    recientes: (a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion) || compararNombre(a, b),
  }
  return [...filtradas].sort(comparadores[orden])
}

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'sas', 's.a.s', 'sa', 'ltda'])

export function inicialesOrganizacion(nombre: string): string {
  const palabras = nombre
    .split(/\s+/)
    .map((palabra) => palabra.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra.toLowerCase()))
  if (palabras.length === 0) return '?'
  const primera = palabras[0].charAt(0)
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1].charAt(0) : ''
  return (primera + ultima).toUpperCase()
}
