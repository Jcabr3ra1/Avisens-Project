import type { EstimacionAlimentoPlan } from '@features/lotes/api/plan-alimento'
import {
  esEstimacionDelPlanVigente,
  etiquetaMotivo,
  explicacionEstadoAlimento,
} from '@features/lotes/model/planAlimentoVista'

// Lo que el formulario de pesaje muestra sobre el alimento del lote. El
// cálculo lo hace SIEMPRE el backend (plan del lote → día objetivo de la
// curva genética → consumo acumulado); aquí solo se decide cómo presentarlo.
// Nunca se muestra un número que el backend no haya calculado.
export type ResumenAlimentoPesaje =
  | { estado: 'pendiente'; mensaje: string }
  | {
      estado: 'calculado'
      totalKg: number
      porAveG: number | null
      diaObjetivo: number | null
      avesVivas: number | null
      avisos: string[]
    }

export const SIN_PLAN =
  'Cálculo pendiente de configuración: este lote no tiene un plan de crecimiento. Defínelo en Lotes → Plan con el peso objetivo.'

export function resumirAlimentoParaPesaje(
  estimacion: EstimacionAlimentoPlan | null,
): ResumenAlimentoPesaje {
  if (estimacion === null) return { estado: 'pendiente', mensaje: SIN_PLAN }

  if (!esEstimacionDelPlanVigente(estimacion)) {
    return {
      estado: 'pendiente',
      mensaje:
        'La última estimación corresponde a una versión anterior del plan. Recalcúlala en Lotes → Plan.',
    }
  }

  if (estimacion.estado_alimento !== 'calculado') {
    return { estado: 'pendiente', mensaje: explicacionEstadoAlimento(estimacion.estado_alimento) }
  }

  const totalKg = estimacion.resultado.consumo_total_kg
  if (totalKg === null) {
    return { estado: 'pendiente', mensaje: 'La estimación del lote no trae el total de alimento.' }
  }

  return {
    estado: 'calculado',
    totalKg,
    porAveG: estimacion.resultado.consumo_por_ave_g,
    diaObjetivo: estimacion.plan.dia_objetivo,
    avesVivas: estimacion.corte.aves_vivas,
    avisos: estimacion.desactualizado ? estimacion.motivos_desactualizacion.map(etiquetaMotivo) : [],
  }
}
