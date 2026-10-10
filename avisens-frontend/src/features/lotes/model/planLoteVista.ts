import type { EstadoCalculoPlan, PlanLote } from '../api/plan-lote'

export type TonoEstado = 'ok' | 'peligro' | 'neutral'

const TONO_ESTADO_PLAN: Record<EstadoCalculoPlan, TonoEstado> = {
  calculado: 'ok',
  sin_curva: 'neutral',
  fuera_de_rango: 'peligro',
  datos_insuficientes: 'peligro',
}

export function tonoEstadoPlan(estado: EstadoCalculoPlan): TonoEstado {
  return TONO_ESTADO_PLAN[estado]
}

const ETIQUETA_ESTADO_PLAN: Record<EstadoCalculoPlan, string> = {
  calculado: 'Calculado',
  sin_curva: 'Sin curva de referencia',
  fuera_de_rango: 'Peso fuera de rango',
  datos_insuficientes: 'Datos insuficientes',
}

export function etiquetaEstadoPlan(estado: EstadoCalculoPlan): string {
  return ETIQUETA_ESTADO_PLAN[estado]
}

// Explica el prerrequisito ausente solo con lo que YA trae la respuesta del
// backend (snapshot.linea_genetica, snapshot.sexo_curva) -- nunca inventa
// una variante nueva de estado_dia que el backend no distingue.
export function explicacionEstadoPlan(plan: PlanLote): string {
  switch (plan.estado_dia) {
    case 'calculado':
      return ''
    case 'sin_curva':
      return plan.snapshot.linea_genetica === null
        ? 'Este lote no tiene línea genética asignada. Un administrador debe asignarle una antes de calcular el plan.'
        : `La línea "${plan.snapshot.linea_genetica.nombre}" no tiene una curva vigente publicada para sexo "${plan.snapshot.sexo_curva}".`
    case 'fuera_de_rango':
      return 'El peso objetivo está fuera del rango que cubre la curva genética publicada. Ajusta el peso o revisa la curva.'
    case 'datos_insuficientes':
      return 'La curva genética no tiene suficientes puntos publicados para interpolar este peso.'
  }
}

export const DESCRIPCION_DESACTUALIZADO_PLAN =
  'La línea genética, el sexo, la fecha de ingreso o la curva vigente cambiaron desde que se calculó este plan.'
