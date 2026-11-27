export const UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL = 5;
export const UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL = 20;

export type ReglaAlertaCrecimiento = {
  regla: 'peso_por_debajo' | 'mortalidad_alta' | 'consumo_fuera_referencia' | 'pesaje_atrasado';
  titulo: string;
  por_que: string;
  que_hacer: string;
  provisional: boolean;
};

export type DatosRiesgoCrecimiento = {
  veredictoPeso: string | null;
  desvioPesoPct: number | null;
  mortalidadAcumuladaPct: number | null;
  desvioConsumoPct: number | null;
  antiguedadPesajeDias: number | null;
  umbralPesajeDias: number | null;
};

export function desvioDeConsumoPct(acumuladoG: number | null, esperadoG: number | null): number | null {
  if (acumuladoG === null || esperadoG === null) return null;
  if (acumuladoG <= 0 || esperadoG <= 0) return null;
  return ((acumuladoG - esperadoG) / esperadoG) * 100;
}

function porcentaje(valor: number): string {
  return `${Math.abs(valor).toFixed(1)} %`;
}

export function evaluarRiesgosCrecimiento(datos: DatosRiesgoCrecimiento): ReglaAlertaCrecimiento[] {
  const alertas: ReglaAlertaCrecimiento[] = [];
  if (datos.veredictoPeso === 'por_debajo') {
    alertas.push({
      regla: 'peso_por_debajo',
      titulo: 'Peso por debajo de la curva',
      por_que: datos.desvioPesoPct === null ? 'El indicador del lote quedó por debajo del rango objetivo.' : `El peso está ${porcentaje(datos.desvioPesoPct)} por debajo de la curva de referencia.`,
      que_hacer: 'Revisa los últimos pesajes y confirma que la curva corresponda a la línea del lote.',
      provisional: false,
    });
  }
  if (datos.mortalidadAcumuladaPct !== null && datos.mortalidadAcumuladaPct > UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL) {
    alertas.push({
      regla: 'mortalidad_alta',
      titulo: 'Mortalidad acumulada alta',
      por_que: `La mortalidad acumulada llegó a ${datos.mortalidadAcumuladaPct.toFixed(1)} %.`,
      que_hacer: 'Confirma los registros de mortalidad y revisa el manejo del lote.',
      provisional: true,
    });
  }
  if (datos.desvioConsumoPct !== null && Math.abs(datos.desvioConsumoPct) > UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL) {
    alertas.push({
      regla: 'consumo_fuera_referencia',
      titulo: 'Consumo fuera de lo esperado',
      por_que: `El consumo acumulado está ${porcentaje(datos.desvioConsumoPct)} ${datos.desvioConsumoPct < 0 ? 'por debajo' : 'por encima'} de la curva genética.`,
      que_hacer: 'Revisa el alimento ofrecido y confirma los registros de consumo.',
      provisional: true,
    });
  }
  if (
    datos.umbralPesajeDias !== null
    && datos.antiguedadPesajeDias !== null
    && datos.antiguedadPesajeDias > datos.umbralPesajeDias
  ) {
    alertas.push({
      regla: 'pesaje_atrasado',
      titulo: 'Pesaje pendiente',
      por_que: `Han pasado ${datos.antiguedadPesajeDias.toFixed(1)} días desde el último pesaje; el aviso está configurado para ${datos.umbralPesajeDias} días.`,
      que_hacer: 'Registra un nuevo pesaje en la Bitácora para actualizar el seguimiento.',
      provisional: false,
    });
  }
  return alertas;
}

export type FilaRiesgoCrecimiento = {
  codigo: string;
  alertas: ReglaAlertaCrecimiento[];
  desvio_peso_pct: number | null;
  desvio_consumo_pct: number | null;
  antiguedad_pesaje_dias: number | null;
};

export function puntajeRiesgoCrecimiento(fila: FilaRiesgoCrecimiento): number {
  return fila.alertas.length;
}

export function ordenarPorRiesgo<T extends FilaRiesgoCrecimiento>(filas: T[]): T[] {
  const excesoMayor = (fila: FilaRiesgoCrecimiento) => Math.max(
    Math.abs(fila.desvio_peso_pct ?? 0),
    Math.abs(fila.desvio_consumo_pct ?? 0),
  );
  return [...filas].sort((a, b) =>
    puntajeRiesgoCrecimiento(b) - puntajeRiesgoCrecimiento(a)
    || excesoMayor(b) - excesoMayor(a)
    || (b.antiguedad_pesaje_dias ?? -1) - (a.antiguedad_pesaje_dias ?? -1)
    || a.codigo.localeCompare(b.codigo, 'es'),
  );
}
