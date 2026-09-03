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
    // El desplegable ofrece "Crítica" como 'alta', pero el backend también
    // emite 'critica'. Sin esto, filtrar por Crítica escondía justo las más
    // graves, que es lo contrario de lo que el usuario pide.
    const coincideCriticidad =
      filtros.criticidad === 'todas' ||
      (filtros.criticidad === 'alta'
        ? esCriticidadAlta(alerta.criticidad)
        : alerta.criticidad === filtros.criticidad)
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

// El backend acepta cuatro niveles —baja, media, alta, critica— pero el
// camino automático de sensores solo produce 'media' y 'alta'; 'critica' solo
// llega en alertas creadas a mano. Antes no estaba contemplada y caía al
// último return: el nivel MÁS grave se mostraba como "Informativa".
export function esCriticidadAlta(criticidad: string): boolean {
  // Se normaliza porque el valor viaja como texto libre: han aparecido
  // 'critica' y 'crítica' según quién la creara.
  const normalizada = criticidad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalizada === 'alta' || normalizada === 'critica'
}

export function etiquetaCriticidad(criticidad: string): string {
  if (esCriticidadAlta(criticidad)) return 'Crítica'
  if (criticidad.toLowerCase() === 'media') return 'Atención'
  return 'Informativa'
}
