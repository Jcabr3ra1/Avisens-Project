import type {
  EstadoCalculoAlimento,
  EstadoDesgloseAlimento,
  EstimacionAlimentoPlan,
  MotivoDesactualizacionAlimento,
  RenglonDesglose,
} from '../api/plan-alimento'
import type { TonoEstado } from './planLoteVista'

const TONO_ESTADO_ALIMENTO: Record<EstadoCalculoAlimento, TonoEstado> = {
  calculado: 'ok',
  plan_sin_dia_objetivo: 'neutral',
  sin_consumo_en_curva: 'peligro',
  consumo_insuficiente: 'peligro',
  consumo_fuera_de_rango: 'peligro',
}

export function tonoEstadoAlimento(estado: EstadoCalculoAlimento): TonoEstado {
  return TONO_ESTADO_ALIMENTO[estado]
}

const ETIQUETA_ESTADO_ALIMENTO: Record<EstadoCalculoAlimento, string> = {
  calculado: 'Calculado',
  plan_sin_dia_objetivo: 'Sin día objetivo en el plan',
  sin_consumo_en_curva: 'Curva sin datos de consumo',
  consumo_insuficiente: 'Consumo insuficiente en la curva',
  consumo_fuera_de_rango: 'Día objetivo fuera del rango de consumo',
}

export function etiquetaEstadoAlimento(estado: EstadoCalculoAlimento): string {
  return ETIQUETA_ESTADO_ALIMENTO[estado]
}

export function explicacionEstadoAlimento(estado: EstadoCalculoAlimento): string {
  switch (estado) {
    case 'calculado':
      return ''
    case 'plan_sin_dia_objetivo':
      return 'El plan de este lote todavía no tiene un día objetivo calculado: no hay horizonte que estimar.'
    case 'sin_consumo_en_curva':
      return 'La curva genética vigente no tiene datos de consumo acumulado cargados.'
    case 'consumo_insuficiente':
      return 'La curva genética tiene menos de dos puntos con consumo: no alcanza para integrar.'
    case 'consumo_fuera_de_rango':
      return 'El día objetivo del plan excede el último punto con consumo de la curva.'
  }
}

// --- Desglose por etapa (Fase 2B) ---

const TONO_ESTADO_DESGLOSE: Record<EstadoDesgloseAlimento, TonoEstado> = {
  legado_sin_desglose: 'neutral',
  lote_sin_marca_alimento: 'neutral',
  marca_sin_catalogo: 'neutral',
  catalogo_invalido: 'peligro',
  catalogo_ambiguo: 'peligro',
  catalogo_incompleto: 'peligro',
  calculado: 'ok',
}

export function tonoEstadoDesglose(estado: EstadoDesgloseAlimento): TonoEstado {
  return TONO_ESTADO_DESGLOSE[estado]
}

const ETIQUETA_ESTADO_DESGLOSE: Record<EstadoDesgloseAlimento, string> = {
  legado_sin_desglose: 'Desglose no disponible (estimación anterior)',
  lote_sin_marca_alimento: 'Sin marca de alimento asignada',
  marca_sin_catalogo: 'Sin catálogo para esta marca',
  catalogo_invalido: 'Catálogo de alimento inválido',
  catalogo_ambiguo: 'Catálogo de alimento ambiguo',
  catalogo_incompleto: 'Desglose incompleto (hay días sin etapa asignada)',
  calculado: 'Calculado',
}

export function etiquetaEstadoDesglose(estado: EstadoDesgloseAlimento): string {
  return ETIQUETA_ESTADO_DESGLOSE[estado]
}

export function explicacionEstadoDesglose(estado: EstadoDesgloseAlimento): string {
  switch (estado) {
    case 'legado_sin_desglose':
      return 'Esta estimación se calculó antes de que existiera el desglose por etapa: no se puede reconstruir.'
    case 'lote_sin_marca_alimento':
      return 'Este lote no tiene una marca de alimento asignada. Un administrador debe asignarle una para poder desglosar por etapa.'
    case 'marca_sin_catalogo':
      return 'No hay ningún alimento activo registrado para la marca de este lote.'
    case 'catalogo_invalido':
      return 'Una fila del catálogo de alimento de esta marca tiene datos inválidos (días o etapa mal definidos).'
    case 'catalogo_ambiguo':
      return 'Dos filas del catálogo de esta marca cubren los mismos días: no se puede decidir cuál usar.'
    case 'catalogo_incompleto':
      return 'El catálogo no cubre todos los días del ciclo: algunos días quedan sin etapa asignada.'
    case 'calculado':
      return ''
  }
}

export function etiquetaRenglon(renglon: RenglonDesglose): string {
  return renglon.tipo_alimento_id === null
    ? 'Sin alimento asignado (hueco de catálogo)'
    : (renglon.tipo_alimento_nombre_snapshot ?? 'Sin nombre')
}

// --- Motivos de desactualización ---

const ETIQUETA_MOTIVO: Record<MotivoDesactualizacionAlimento, string> = {
  plan_cambio: 'El plan de crecimiento cambió de versión',
  sin_plan_vigente: 'El lote ya no tiene un plan vigente',
  cantidad_inicial_cambio: 'La cantidad inicial del lote cambió',
  algoritmo_cambio: 'El algoritmo de cálculo de alimento se actualizó',
  mortalidad_cambio: 'La mortalidad registrada cambió respecto al cálculo',
  mortalidad_actual_incoherente: 'La mortalidad actual del lote no es coherente',
  algoritmo_desglose_cambio: 'El algoritmo del desglose por etapa se actualizó',
  marca_alimento_cambio: 'La marca de alimento del lote cambió',
}

export function etiquetaMotivo(motivo: MotivoDesactualizacionAlimento): string {
  return ETIQUETA_MOTIVO[motivo]
}

// Una estimación puede pertenecer a una version anterior del plan (el plan
// cambió después de calcularla). Nunca se presenta como si fuera la vigente.
export function esEstimacionDelPlanVigente(estimacion: EstimacionAlimentoPlan): boolean {
  return estimacion.plan_vigente !== null && estimacion.plan_vigente.es_el_mismo
}
