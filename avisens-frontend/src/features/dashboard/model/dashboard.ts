import { diasDeVida } from '@shared/utils/fechas'
import { esCriticidadAlta } from '@features/alertas/model/alerta'
import type { EstadoCalculoIndicador } from '@features/indicadores/api/indicadores'

export interface DashboardGranja {
  id: number
  nombre: string
  activa: boolean
}

export interface DashboardGalpon {
  id: number
  granjaId: number
  codigo: string
  nombre: string
  activo: boolean
}

export interface DashboardLote {
  id: number
  galponId: number
  codigo: string
  fechaIngreso: string
  cantidadInicial: number
  estado: string
}

export interface DashboardAlerta {
  id: number
  galponId: number
  criticidad: string
  mensaje: string | null
  tipo: string
  estado: string
  fechaCreacion: string
}

export interface DashboardIndicador {
  fecha: string
  diaVida: number | null
  pesoPromedioG: number | null
  fcr: number | null
  epef: number | null
  mortalidadAcumuladaPct: number | null
  estadoCalculo: EstadoCalculoIndicador
  // Fecha del pesaje que usan fcr/epef (contrato "al corte del pesaje").
  pesajeFechaSnapshot: string | null
  revisionCalculo: number
}

export interface DashboardFuentes {
  granjas: DashboardGranja[]
  galpones: DashboardGalpon[]
  lotes: DashboardLote[]
  alertas: DashboardAlerta[]
}

export function calcularDiaLote(fechaIngreso: string): number {
  // Misma convención que el backend: el día de ingreso es el 0. Antes sumaba
  // uno, así que el mismo lote salía con un día distinto según si el trabajo
  // de indicadores ya había corrido o si se usaba este cálculo de respaldo.
  return diasDeVida(fechaIngreso)
}

export function ordenarAlertas(alertas: DashboardAlerta[]): DashboardAlerta[] {
  const prioridad = (criticidad: string) => {
    const valor = criticidad.toLowerCase()
    if (esCriticidadAlta(valor)) return 0
    if (['media', 'advertencia'].includes(valor)) return 1
    return 2
  }

  return [...alertas].sort((a, b) => {
    const diferenciaPrioridad = prioridad(a.criticidad) - prioridad(b.criticidad)
    if (diferenciaPrioridad !== 0) return diferenciaPrioridad
    return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
  })
}
