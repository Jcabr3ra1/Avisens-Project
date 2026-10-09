import { calcularTiempoCrianza, PlanParaTiempo } from './tiempo-crianza';

const AHORA = new Date('2026-10-09T15:00:00.000Z');

function plan(parcial: Partial<PlanParaTiempo> = {}): PlanParaTiempo {
  return {
    version: 2,
    fecha_ingreso_snapshot: new Date('2026-09-19T00:00:00.000Z'),
    dia_objetivo: 36,
    fecha_salida_calculada: new Date('2026-10-24T00:00:00.000Z'),
    ...parcial,
  };
}

describe('calcularTiempoCrianza', () => {
  it('en curso: día 21 de 36, quedan 15 días', () => {
    expect(calcularTiempoCrianza(plan(), AHORA)).toEqual({
      plan_version: 2,
      situacion: 'en_curso',
      dia_actual: 21,
      dia_objetivo: 36,
      fecha_estimada: new Date('2026-10-24T00:00:00.000Z'),
      dias_restantes: 15,
      dias_sobre_objetivo: null,
    });
  });

  it('el último día antes del objetivo deja 1 día restante', () => {
    const t = calcularTiempoCrianza(plan({ dia_objetivo: 22 }), AHORA);
    expect(t.situacion).toBe('en_curso');
    expect(t.dias_restantes).toBe(1);
  });

  it('objetivo alcanzado hoy: 0 días restantes y sin exceso', () => {
    const t = calcularTiempoCrianza(plan({ dia_objetivo: 21 }), AHORA);
    expect(t.situacion).toBe('objetivo_hoy');
    expect(t.dias_restantes).toBe(0);
    expect(t.dias_sobre_objetivo).toBeNull();
  });

  it('objetivo superado: 0 restantes y los días de exceso aparte, sin negativos', () => {
    const t = calcularTiempoCrianza(plan({ dia_objetivo: 18 }), AHORA);
    expect(t.situacion).toBe('objetivo_superado');
    expect(t.dias_restantes).toBe(0);
    expect(t.dias_sobre_objetivo).toBe(3);
    expect(t.dia_actual).toBe(21);
  });

  it('lote con ingreso futuro: no iniciado, el día actual queda crudo y los días restantes incluyen la espera', () => {
    const t = calcularTiempoCrianza(
      plan({
        fecha_ingreso_snapshot: new Date('2026-10-12T00:00:00.000Z'),
        dia_objetivo: 32,
        fecha_salida_calculada: new Date('2026-11-12T00:00:00.000Z'),
      }),
      AHORA,
    );
    expect(t.situacion).toBe('no_iniciado');
    expect(t.dia_actual).toBe(-2);
    expect(t.dias_restantes).toBe(34);
  });

  it('el día de ingreso es el día 1', () => {
    const t = calcularTiempoCrianza(
      plan({ fecha_ingreso_snapshot: new Date('2026-10-09T00:00:00.000Z') }),
      AHORA,
    );
    expect(t.dia_actual).toBe(1);
    expect(t.situacion).toBe('en_curso');
  });

  it('sin día objetivo: todo lo derivado queda null y nunca 0', () => {
    const t = calcularTiempoCrianza(
      plan({ dia_objetivo: null, fecha_salida_calculada: null }),
      AHORA,
    );
    expect(t).toEqual({
      plan_version: 2,
      situacion: 'sin_dia_objetivo',
      dia_actual: 21,
      dia_objetivo: null,
      fecha_estimada: null,
      dias_restantes: null,
      dias_sobre_objetivo: null,
    });
  });

  it('usa el día de la zona de la granja, no el UTC', () => {
    const casiMedianocheBogota = new Date('2026-10-10T03:00:00.000Z');
    expect(calcularTiempoCrianza(plan(), casiMedianocheBogota).dia_actual).toBe(
      21,
    );
  });
});
