import {
  diaDeVida,
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
