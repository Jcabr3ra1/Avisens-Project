import {
  diaDeVida,
  diaDeVidaDeFecha,
  fechaDeVida,
  fechaEnZonaGranja,
  inicioDelDiaEnZonaGranja,
  semanaDeVida,
} from './dias-de-vida';

// fecha_ingreso es @db.Date: Prisma la devuelve como medianoche UTC.
const ingreso = new Date('2026-07-30T00:00:00.000Z');

describe('fechaEnZonaGranja', () => {
  it('a las 02:00 UTC todavía es el día anterior en la granja', () => {
    expect(fechaEnZonaGranja(new Date('2026-09-03T02:00:00.000Z'))).toBe(
      '2026-09-02',
    );
  });

  it('a las 05:00 UTC ya cambió el día en la granja', () => {
    expect(fechaEnZonaGranja(new Date('2026-09-03T05:00:00.000Z'))).toBe(
      '2026-09-03',
    );
  });
});

describe('diaDeVida', () => {
  it('el día de ingreso es el día 1', () => {
    expect(diaDeVida(ingreso, new Date('2026-07-30T15:00:00.000Z'))).toBe(1);
  });

  it('al día siguiente es 2', () => {
    expect(diaDeVida(ingreso, new Date('2026-07-31T15:00:00.000Z'))).toBe(2);
  });

  // El defecto que traía el cálculo viejo: el job de las 02:00 UTC corre a las
  // 21:00 en la granja, cuando allá todavía es el día anterior.
  it('el job de las 02:00 UTC cuenta el día que vive la granja, no el del servidor', () => {
    expect(diaDeVida(ingreso, new Date('2026-09-03T02:00:00.000Z'))).toBe(35);
    expect(diaDeVida(ingreso, new Date('2026-09-03T05:00:00.000Z'))).toBe(36);
  });

  it('no cambia con la hora del día dentro del mismo día de granja', () => {
    const manana = diaDeVida(ingreso, new Date('2026-08-15T12:00:00.000Z'));
    const noche = diaDeVida(ingreso, new Date('2026-08-15T23:59:00.000Z'));
    expect(manana).toBe(noche);
  });

  it('los días son consecutivos sin saltos ni repeticiones', () => {
    const dias = Array.from({ length: 10 }, (_, i) => {
      const d = new Date('2026-07-30T15:00:00.000Z');
      d.setUTCDate(d.getUTCDate() + i);
      return diaDeVida(ingreso, d);
    });
    expect(dias).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('semanaDeVida', () => {
  // Sin el -1 el día 7 caería ya en la semana 1 y la primera duraría seis
  // días. semana_vida es lo que busca el umbral del galpón, así que un
  // corrimiento aquí elige el rango ambiental equivocado.
  it('cada semana dura exactamente siete días', () => {
    for (let semana = 0; semana < 6; semana += 1) {
      const primerDia = semana * 7 + 1;
      const ultimoDia = semana * 7 + 7;
      expect(semanaDeVida(primerDia)).toBe(semana);
      expect(semanaDeVida(ultimoDia)).toBe(semana);
      expect(semanaDeVida(ultimoDia + 1)).toBe(semana + 1);
    }
  });

  it('el día 7 sigue en la primera semana', () => {
    expect(semanaDeVida(7)).toBe(0);
    expect(semanaDeVida(8)).toBe(1);
  });

  it('nunca devuelve una semana negativa', () => {
    expect(semanaDeVida(1)).toBe(0);
    expect(semanaDeVida(0)).toBe(0);
    expect(semanaDeVida(-5)).toBe(0);
  });
});

describe('inicioDelDiaEnZonaGranja', () => {
  it('estampa el día de la granja, no el del servidor', () => {
    expect(
      inicioDelDiaEnZonaGranja(new Date('2026-09-03T02:00:00.000Z')),
    ).toEqual(new Date('2026-09-02T00:00:00.000Z'));
  });
});

describe('fechaDeVida', () => {
  it('el día 1 es la fecha de ingreso misma', () => {
    expect(fechaDeVida(ingreso, 1)).toEqual(ingreso);
  });

  it('el día 2 es el día siguiente', () => {
    expect(fechaDeVida(ingreso, 2)).toEqual(
      new Date('2026-07-31T00:00:00.000Z'),
    );
  });

  it('el día 35 cae treinta y cuatro días después del ingreso', () => {
    expect(fechaDeVida(ingreso, 35)).toEqual(
      new Date('2026-09-02T00:00:00.000Z'),
    );
  });

  it('cruza correctamente el límite de mes', () => {
    // getMonth() (local) vs getUTCMonth() habría corrido este caso un mes si
    // el servidor no corriera en UTC: 31 de julio -> 1 de agosto.
    expect(fechaDeVida(ingreso, 2)).toEqual(
      new Date('2026-07-31T00:00:00.000Z'),
    );
    expect(fechaDeVida(ingreso, 3)).toEqual(
      new Date('2026-08-01T00:00:00.000Z'),
    );
  });

  it('es la inversa de diaDeVida para cualquier día de vida', () => {
    // diaDeVida espera un instante real como "ahora": mediodía UTC cae dentro
    // del mismo día de granja (ver 05:00 UTC como el corte, arriba), a
    // diferencia de la medianoche UTC que devuelve fechaDeVida.
    for (let dia = 1; dia <= 42; dia += 1) {
      const fecha = fechaDeVida(ingreso, dia);
      const ahora = new Date(fecha.getTime() + 12 * 60 * 60 * 1000);
      expect(diaDeVida(ingreso, ahora)).toBe(dia);
    }
  });

  // Fase 2A: dia_corte = 0 describe un lote que aun no ha ingresado
  // (planificacion). El dia 0 es el dia anterior al ingreso -- no un caso
  // especial, sale de la misma resta que cualquier otro dia.
  it('el día 0 es el día anterior al ingreso', () => {
    expect(fechaDeVida(ingreso, 0)).toEqual(
      new Date('2026-07-29T00:00:00.000Z'),
    );
  });
});

describe('diaDeVidaDeFecha', () => {
  it('la fecha de ingreso misma es el día 1', () => {
    expect(diaDeVidaDeFecha(ingreso, ingreso)).toBe(1);
  });

  it('el día siguiente es el día 2', () => {
    expect(
      diaDeVidaDeFecha(ingreso, new Date('2026-07-31T00:00:00.000Z')),
    ).toBe(2);
  });

  it('una fecha anterior al ingreso da 0 o negativo (el llamador decide si es un error)', () => {
    expect(
      diaDeVidaDeFecha(ingreso, new Date('2026-07-29T00:00:00.000Z')),
    ).toBe(0);
    expect(
      diaDeVidaDeFecha(ingreso, new Date('2026-07-28T00:00:00.000Z')),
    ).toBe(-1);
  });

  it('es la inversa exacta de fechaDeVida, incluido el día 0', () => {
    for (let dia = 0; dia <= 42; dia += 1) {
      const fecha = fechaDeVida(ingreso, dia);
      expect(diaDeVidaDeFecha(ingreso, fecha)).toBe(dia);
    }
  });

  it('no cruza por la zona de la granja: opera sobre componentes UTC puros de ambas fechas', () => {
    // A diferencia de diaDeVida(ingreso, ahora), donde `ahora` SI se mueve a
    // zona granja: aqui las dos fechas son @db.Date, ninguna se convierte.
    const fechaMortalidad = new Date('2026-09-03T02:00:00.000Z');
    const esperado =
      Math.round(
        (Date.UTC(2026, 8, 3) - Date.UTC(2026, 6, 30)) / (24 * 60 * 60 * 1000),
      ) + 1;
    expect(diaDeVidaDeFecha(ingreso, fechaMortalidad)).toBe(esperado);
  });
});
