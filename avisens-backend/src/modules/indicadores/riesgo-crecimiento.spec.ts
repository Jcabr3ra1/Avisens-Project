import {
  evaluarRiesgosCrecimiento,
  ordenarPorRiesgo,
  UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL,
  UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL,
} from './riesgo-crecimiento';

describe('reglas de riesgo de crecimiento', () => {
  const base = {
    veredictoPeso: null,
    desvioPesoPct: null,
    mortalidadAcumuladaPct: null,
    desvioConsumoPct: null,
    antiguedadPesajeDias: null,
    umbralPesajeDias: null,
  };

  it('reutiliza el veredicto existente para el peso bajo', () => {
    const alertas = evaluarRiesgosCrecimiento({ ...base, veredictoPeso: 'por_debajo', desvioPesoPct: -7.5 });
    expect(alertas.map((alerta) => alerta.regla)).toEqual(['peso_por_debajo']);
    expect(alertas[0].provisional).toBe(false);
  });

  it('usa el umbral de mortalidad provisional y deja el límite exacto fuera', () => {
    expect(evaluarRiesgosCrecimiento({ ...base, mortalidadAcumuladaPct: UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL })).toEqual([]);
    const alertas = evaluarRiesgosCrecimiento({ ...base, mortalidadAcumuladaPct: 5.1 });
    expect(alertas[0].regla).toBe('mortalidad_alta');
    expect(alertas[0].provisional).toBe(true);
  });

  it('detecta desviación de consumo a ambos lados con umbral provisional estricto', () => {
    expect(evaluarRiesgosCrecimiento({ ...base, desvioConsumoPct: UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL })).toEqual([]);
    expect(evaluarRiesgosCrecimiento({ ...base, desvioConsumoPct: -21 })[0].regla).toBe('consumo_fuera_referencia');
    expect(evaluarRiesgosCrecimiento({ ...base, desvioConsumoPct: 21 })[0].provisional).toBe(true);
  });

  it('no inventa aviso de pesaje si el umbral no está configurado', () => {
    expect(evaluarRiesgosCrecimiento({ ...base, antiguedadPesajeDias: 12 })).toEqual([]);
    expect(evaluarRiesgosCrecimiento({ ...base, antiguedadPesajeDias: 3, umbralPesajeDias: 2 })[0].regla).toBe('pesaje_atrasado');
  });

  it('ordena por reglas activas, magnitud y antigüedad con desempate estable', () => {
    const filas = ordenarPorRiesgo([
      { codigo: 'B', alertas: [], desvio_peso_pct: null, desvio_consumo_pct: null, antiguedad_pesaje_dias: null },
      { codigo: 'C', alertas: [{ regla: 'mortalidad_alta', titulo: '', por_que: '', que_hacer: '', provisional: true }], desvio_peso_pct: -5, desvio_consumo_pct: null, antiguedad_pesaje_dias: 3 },
      { codigo: 'A', alertas: [{ regla: 'peso_por_debajo', titulo: '', por_que: '', que_hacer: '', provisional: false }, { regla: 'pesaje_atrasado', titulo: '', por_que: '', que_hacer: '', provisional: false }], desvio_peso_pct: -6, desvio_consumo_pct: null, antiguedad_pesaje_dias: 4 },
    ]);
    expect(filas.map((fila) => fila.codigo)).toEqual(['A', 'C', 'B']);
  });
});
