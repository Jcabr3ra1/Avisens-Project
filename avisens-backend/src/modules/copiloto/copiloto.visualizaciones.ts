import type { CurvaCrecimientoService } from '../predicciones/curva-crecimiento.service';
import type { RiesgoCalorService } from '../predicciones/riesgo-calor.service';

export type CurvaCrecimiento = Awaited<
  ReturnType<CurvaCrecimientoService['calcular']>
>;

export type Visualizacion = {
  tipo: 'curva_crecimiento';
  titulo: string;
  datos: CurvaCrecimiento;
};

export function resumirCurvaParaClaude(curva: CurvaCrecimiento) {
  const semanal = curva.serie.filter(
    (punto) => punto.dia % 7 === 0 || punto.dia === curva.dia_final,
  );
  return {
    lote: curva.codigo,
    dia_actual: curva.dia_actual,
    dia_final: curva.dia_final,
    peso_objetivo_g: curva.peso_objetivo_g,
    referencia_genetica: curva.referencias.genetica?.linea ?? null,
    resumen: curva.resumen,
    confianza: curva.modelo.confianza,
    pesajes_usados: curva.modelo.puntos_usados,
    semanal: semanal.map((punto) => ({
      dia: punto.dia,
      real_g: punto.real_g,
      proyectado_g: punto.proyectado_g,
      rango_g: [punto.min_g, punto.max_g],
      estandar_g: punto.estandar_g,
    })),
    nota: 'El usuario ya ve la curva completa en un grafico: interpretala, no la recites punto por punto.',
  };
}

export type RiesgoCalor = Awaited<ReturnType<RiesgoCalorService['calcular']>>;

export function resumirRiesgoParaClaude(riesgo: RiesgoCalor) {
  return {
    galpon: riesgo.galpon,
    lote: riesgo.lote,
    ubicacion_pronostico: riesgo.ubicacion.origen,
    interior_ultima_hora: riesgo.interior,
    horas_pronosticadas: riesgo.serie.length,
    nivel_maximo: riesgo.nivel_maximo,
    pico: riesgo.pico,
    primera_alerta: riesgo.primera_alerta,
    horas_por_nivel: riesgo.horas_por_nivel,
    recomendaciones: riesgo.recomendaciones,
    nota: 'Niveles de menor a mayor: confort, atencion, alerta, peligro, emergencia. Las horas vienen en hora de Colombia. Si temperatura y humedad de interior_ultima_hora son null, el galpon no tiene sensores reportando en la ultima hora y el calculo usa solo el clima exterior: dilo.',
  };
}
