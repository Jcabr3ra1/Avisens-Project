import type { Alerta as AlertaApi, EstadoAlerta } from '../api/alertas'

export type { AlertaApi as Alerta, EstadoAlerta }

export type FiltroEstado = EstadoAlerta | 'todas'
export type FiltroCriticidad = 'alta' | 'media' | 'baja' | 'todas'

export interface FiltrosAlertas {
  estado: FiltroEstado
  criticidad: FiltroCriticidad
  galponId: string
}

export interface ResumenAlertas {
  total: number
  abiertas: number
  enProceso: number
  criticas: number
}

export function obtenerResumenAlertas(alertas: AlertaApi[]): ResumenAlertas {
  return {
    total: alertas.length,
    abiertas: alertas.filter((alerta) => alerta.estado === 'abierta').length,
    enProceso: alertas.filter((alerta) => alerta.estado === 'en_proceso').length,
    criticas: alertas.filter(
      (alerta) => alerta.criticidad === 'alta' && alerta.estado !== 'cerrada',
    ).length,
  }
}

export function filtrarAlertas(
  alertas: AlertaApi[],
  filtros: FiltrosAlertas,
): AlertaApi[] {
  return alertas.filter((alerta) => {
    const coincideEstado = filtros.estado === 'todas' || alerta.estado === filtros.estado
    const coincideCriticidad =
      filtros.criticidad === 'todas' || alerta.criticidad === filtros.criticidad
    const coincideGalpon =
      filtros.galponId === 'todos' || alerta.galpon_id === Number(filtros.galponId)
    return coincideEstado && coincideCriticidad && coincideGalpon
  })
}

export function etiquetaEstado(estado: EstadoAlerta): string {
  if (estado === 'abierta') return 'Por atender'
  if (estado === 'en_proceso') return 'En atención'
  return 'Cerrada'
}

export function etiquetaCriticidad(criticidad: string): string {
  if (criticidad === 'alta') return 'Crítica'
  if (criticidad === 'media') return 'Atención'
  return 'Informativa'
}
