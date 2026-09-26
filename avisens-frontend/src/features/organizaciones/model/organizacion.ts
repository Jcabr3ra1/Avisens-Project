import type { Organizacion } from '../api/organizaciones'

// Una organización es un cliente de Avisens: la empresa que contrata el
// sistema. De ella cuelgan sus usuarios y sus granjas.

export interface ResumenOrganizaciones {
  total: number
  activas: number
  granjas: number
  usuarios: number
}

export function resumirOrganizaciones(
  organizaciones: Organizacion[],
): ResumenOrganizaciones {
  return {
    total: organizaciones.length,
    activas: organizaciones.filter((item) => item.activa).length,
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
