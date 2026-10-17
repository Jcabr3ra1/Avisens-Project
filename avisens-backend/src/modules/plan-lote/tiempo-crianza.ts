import { diaDeVida } from '../../common/fechas/dias-de-vida';

export type SituacionCrianza =
  | 'sin_dia_objetivo'
  | 'no_iniciado'
  | 'en_curso'
  | 'objetivo_hoy'
  | 'objetivo_superado';

export interface TiempoCrianza {
  plan_version: number;
  situacion: SituacionCrianza;
  dia_actual: number;
  dia_objetivo: number | null;
  fecha_estimada: Date | null;
  dias_restantes: number | null;
  dias_sobre_objetivo: number | null;
}

export interface PlanParaTiempo {
  version: number;
  fecha_ingreso_snapshot: Date;
  dia_objetivo: number | null;
  fecha_salida_calculada: Date | null;
}

export function calcularTiempoCrianza(
  plan: PlanParaTiempo,
  ahora: Date = new Date(),
): TiempoCrianza {
  const diaActual = diaDeVida(plan.fecha_ingreso_snapshot, ahora);

  if (plan.dia_objetivo === null) {
    return {
      plan_version: plan.version,
      situacion: 'sin_dia_objetivo',
      dia_actual: diaActual,
      dia_objetivo: null,
      fecha_estimada: null,
      dias_restantes: null,
      dias_sobre_objetivo: null,
    };
  }

  const diferencia = plan.dia_objetivo - diaActual;
  let situacion: SituacionCrianza = 'en_curso';
  if (diferencia < 0) situacion = 'objetivo_superado';
  else if (diferencia === 0) situacion = 'objetivo_hoy';
  else if (diaActual < 1) situacion = 'no_iniciado';

  return {
    plan_version: plan.version,
    situacion,
    dia_actual: diaActual,
    dia_objetivo: plan.dia_objetivo,
    fecha_estimada: plan.fecha_salida_calculada,
    dias_restantes: Math.max(0, diferencia),
    dias_sobre_objetivo: diferencia < 0 ? -diferencia : null,
  };
}
