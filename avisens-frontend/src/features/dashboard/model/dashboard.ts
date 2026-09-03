import { diasDeVida } from '@shared/utils/fechas'
import { esCriticidadAlta } from '@features/alertas/model/alerta'
export type EstadoDashboard = 'correcto' | 'atencion' | 'urgente' | 'sin_lote'

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
}

export interface DashboardFuentes {
  granjas: DashboardGranja[]
  galpones: DashboardGalpon[]
  lotes: DashboardLote[]
  alertas: DashboardAlerta[]
}

export interface EstadoGeneralDashboard {
  estado: EstadoDashboard
  titulo: string
  descripcion: string
}

export function calcularDiaLote(fechaIngreso: string): number {
  // Misma convención que el backend: el día de ingreso es el 0. Antes sumaba
  // uno, así que el mismo lote salía con un día distinto según si el trabajo
  // de indicadores ya había corrido o si se usaba este cálculo de respaldo.
  return diasDeVida(fechaIngreso)
}

export function obtenerEstadoGeneral(
  lote: DashboardLote | null,
  alertas: DashboardAlerta[],
): EstadoGeneralDashboard {
  if (!lote) {
    return {
      estado: 'sin_lote',
      titulo: 'Este galpón todavía no tiene un lote activo',
      descripcion: 'Ingresa un lote para comenzar el seguimiento productivo.',
    }
  }

  const abiertas = alertas.filter((alerta) => alerta.estado !== 'cerrada')
  const criticas = abiertas.filter((alerta) =>
    esCriticidadAlta(alerta.criticidad),
  )

  if (criticas.length > 0) {
    return {
      estado: 'urgente',
      titulo: criticas.length === 1 ? 'Hay una situación urgente' : `Hay ${criticas.length} situaciones urgentes`,
      descripcion: 'Revisa las alertas prioritarias y registra la acción realizada.',
    }
  }

  if (abiertas.length > 0) {
    return {
      estado: 'atencion',
      titulo: abiertas.length === 1 ? 'Hay una alerta por revisar' : `Hay ${abiertas.length} alertas por revisar`,
      descripcion: 'Consulta el detalle para saber qué ocurrió y qué puedes hacer.',
    }
  }

  return {
    estado: 'correcto',
    titulo: 'Todo está en orden',
    descripcion: 'No hay alertas abiertas para el galpón seleccionado.',
  }
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
