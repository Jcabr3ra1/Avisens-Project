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
      (alerta) => esCriticidadAlta(alerta.criticidad) && alerta.estado !== 'cerrada',
    ).length,
  }
}

export function filtrarAlertas(
  alertas: AlertaApi[],
  filtros: FiltrosAlertas,
): AlertaApi[] {
  return alertas.filter((alerta) => {
    const coincideEstado = filtros.estado === 'todas' || alerta.estado === filtros.estado
    // El desplegable ofrece "Crítica" como 'alta', que es el techo de la
    // escala. Se compara por esCriticidadAlta y no en crudo para que los datos
    // escritos antes de unificar la escala sigan encontrándose.
    const coincideCriticidad =
      filtros.criticidad === 'todas' ||
      (filtros.criticidad === 'alta'
        ? esCriticidadAlta(alerta.criticidad)
        : normalizarCriticidad(alerta.criticidad) === filtros.criticidad)
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

// La escala es baja/media/alta y 'alta' es el techo. Se sigue aceptando
// 'critica' porque estuvo permitida hasta que se unificó la escala: cualquier
// fila vieja con ese valor debe seguir contando como grave, no caer al último
// return y mostrarse como "Informativa", que es el bug que hubo aquí.
export function esCriticidadAlta(criticidad: string): boolean {
  const normalizada = normalizarCriticidad(criticidad)
  return normalizada === 'alta' || normalizada === 'critica'
}

// El campo aceptó texto libre hasta que el backend le puso @IsIn, así que
// llegaron a convivir 'critica' y 'crítica'. Comparar en crudo dejaba fuera a
// la mitad, así que todo el módulo compara por aquí.
export function normalizarCriticidad(criticidad: string): string {
  return criticidad.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function etiquetaCriticidad(criticidad: string): string {
  if (esCriticidadAlta(criticidad)) return 'Crítica'
  if (normalizarCriticidad(criticidad) === 'media') return 'Atención'
  return 'Informativa'
}
