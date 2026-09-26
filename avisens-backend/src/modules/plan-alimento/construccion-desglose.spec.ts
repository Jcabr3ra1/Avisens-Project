import { Prisma } from '@prisma/client';
import {
  FilaCatalogoAlimento,
  ParametrosConstruccionDesglose,
  construirDesgloseAlimento,
} from './desglose-alimento';

function filaCatalogo(
  id: number,
  diaInicio: number | null,
  diaFin: number | null,
  opts: { nombre?: string; etapa?: string | null; marca?: string | null } = {},
): FilaCatalogoAlimento {
  return {
    id,
    nombre: opts.nombre ?? 'Alimento',
    marca: opts.marca === undefined ? 'italcol' : opts.marca,
    etapa: opts.etapa === undefined ? 'preiniciacion' : opts.etapa,
    diaInicio,
    diaFin,
  };
}

function acumuladorLineal(factor: string): (dia: number) => Prisma.Decimal {
  return (dia: number) => new Prisma.Decimal(factor).mul(dia);
}

function parametrosBase(
  overrides: Partial<ParametrosConstruccionDesglose> = {},
): ParametrosConstruccionDesglose {
  return {
    marcaAlimento: 'italcol',
    diaObjetivoSnapshot: 10,
    consumoPorAveGEsperado: new Prisma.Decimal('100.00'),
    consumoTotalKgEsperado: new Prisma.Decimal('1.000'),
    catalogo: [],
    acumuladoPorAveEnDia: acumuladorLineal('10'),
    acumuladoTotalKgEnDia: acumuladorLineal('0.1'),
    ...overrides,
  };
}

describe('construirDesgloseAlimento -- lote_sin_marca_alimento y marca_sin_catalogo', () => {
  it('marca del lote nula: sin renglones, sin snapshot de marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        marcaAlimento: null,
        catalogo: [filaCatalogo(1, 1, 10)],
      }),
    );

    expect(resultado.estado).toBe('lote_sin_marca_alimento');
    expect(resultado.marcaAlimentoSnapshot).toBeNull();
    expect(resultado.renglones).toEqual([]);
  });

  it('catalogo sin ninguna fila de la marca del lote: marca_sin_catalogo', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [filaCatalogo(1, 1, 10, { marca: 'solla' })],
      }),
    );

    expect(resultado.estado).toBe('marca_sin_catalogo');
    expect(resultado.marcaAlimentoSnapshot).toBe('italcol');
    expect(resultado.renglones).toEqual([]);
  });
});

describe('construirDesgloseAlimento -- catalogo_invalido', () => {
  it('dia_inicio nulo invalida toda la marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({ catalogo: [filaCatalogo(1, null, 10)] }),
    );
    expect(resultado.estado).toBe('catalogo_invalido');
    expect(resultado.renglones).toEqual([]);
  });

  it('dia_fin menor que dia_inicio invalida toda la marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({ catalogo: [filaCatalogo(1, 5, 3)] }),
    );
    expect(resultado.estado).toBe('catalogo_invalido');
  });

  it('nombre vacio invalida toda la marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [filaCatalogo(1, 1, 10, { nombre: '' })],
      }),
    );
    expect(resultado.estado).toBe('catalogo_invalido');
  });

  it('etapa fuera de ETAPAS_ALIMENTACION invalida toda la marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [filaCatalogo(1, 1, 10, { etapa: 'desconocida' })],
      }),
    );
    expect(resultado.estado).toBe('catalogo_invalido');
  });

  it('una fila valida junto a una invalida invalida toda la marca', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [
          filaCatalogo(1, 1, 5),
          filaCatalogo(2, 6, 10, { etapa: null }),
        ],
      }),
    );
    expect(resultado.estado).toBe('catalogo_invalido');
  });
});

describe('construirDesgloseAlimento -- catalogo_ambiguo', () => {
  it('dia_fin nulo en una fila que no es la ultima es ambiguo', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [
          filaCatalogo(1, 1, null),
          filaCatalogo(2, 6, 10, { etapa: 'iniciacion' }),
        ],
      }),
    );
    expect(resultado.estado).toBe('catalogo_ambiguo');
    expect(resultado.renglones).toEqual([]);
  });

  it('dos filas que se solapan son ambiguas', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [
          filaCatalogo(1, 1, 8),
          filaCatalogo(2, 6, 10, { etapa: 'iniciacion' }),
        ],
      }),
    );
    expect(resultado.estado).toBe('catalogo_ambiguo');
  });

  it('terminar e iniciar el mismo dia es solape (rango inclusivo)', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        diaObjetivoSnapshot: 15,
        catalogo: [
          filaCatalogo(1, 1, 10),
          filaCatalogo(2, 10, 15, { etapa: 'iniciacion' }),
        ],
      }),
    );
    expect(resultado.estado).toBe('catalogo_ambiguo');
  });

  it('terminar en un dia y empezar al siguiente es continuidad, no solape', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        diaObjetivoSnapshot: 15,
        consumoPorAveGEsperado: new Prisma.Decimal('150.00'),
        consumoTotalKgEsperado: new Prisma.Decimal('1.500'),
        catalogo: [
          filaCatalogo(1, 1, 10),
          filaCatalogo(2, 11, 15, { etapa: 'iniciacion' }),
        ],
      }),
    );
    expect(resultado.estado).toBe('calculado');
  });
});

describe('construirDesgloseAlimento -- calculado', () => {
  it('dos etapas contiguas, la ultima abierta (dia_fin null) se extiende hasta dia_objetivo', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [
          filaCatalogo(1, 1, 8, { nombre: 'Preiniciador' }),
          filaCatalogo(2, 9, null, {
            nombre: 'Iniciador',
            etapa: 'iniciacion',
          }),
        ],
      }),
    );

    expect(resultado.estado).toBe('calculado');
    expect(resultado.renglones).toEqual([
      expect.objectContaining({
        orden: 1,
        tipoAlimentoId: 1,
        tipoAlimentoNombreSnapshot: 'Preiniciador',
        etapaSnapshot: 'preiniciacion',
        diaInicio: 1,
        diaFin: 8,
        extendidoHastaDiaObjetivo: false,
        consumoPorAveG: new Prisma.Decimal('80.00'),
        consumoTotalKg: new Prisma.Decimal('0.800'),
      }),
      expect.objectContaining({
        orden: 2,
        tipoAlimentoId: 2,
        tipoAlimentoNombreSnapshot: 'Iniciador',
        etapaSnapshot: 'iniciacion',
        diaInicio: 9,
        diaFin: 10,
        extendidoHastaDiaObjetivo: true,
        consumoPorAveG: new Prisma.Decimal('20.00'),
        consumoTotalKg: new Prisma.Decimal('0.200'),
      }),
    ]);
  });

  it('una etapa mas alla del horizonte se excluye y la anterior se recorta a dia_objetivo', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        diaObjetivoSnapshot: 5,
        consumoPorAveGEsperado: new Prisma.Decimal('50.00'),
        consumoTotalKgEsperado: new Prisma.Decimal('0.500'),
        catalogo: [
          filaCatalogo(1, 1, 8, { nombre: 'Preiniciador' }),
          filaCatalogo(2, 9, 42, {
            nombre: 'Engorde',
            etapa: 'engorde',
          }),
        ],
      }),
    );

    expect(resultado.estado).toBe('calculado');
    expect(resultado.renglones).toHaveLength(1);
    expect(resultado.renglones[0]).toEqual(
      expect.objectContaining({
        tipoAlimentoId: 1,
        diaInicio: 1,
        diaFin: 5,
        extendidoHastaDiaObjetivo: false,
        consumoPorAveG: new Prisma.Decimal('50.00'),
        consumoTotalKg: new Prisma.Decimal('0.500'),
      }),
    );
  });
});

describe('construirDesgloseAlimento -- catalogo_incompleto', () => {
  it('hueco de cabeza: la primera etapa no empieza en el dia 1', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [filaCatalogo(1, 3, 10, { nombre: 'Iniciador', etapa: 'iniciacion' })],
      }),
    );

    expect(resultado.estado).toBe('catalogo_incompleto');
    expect(resultado.renglones).toEqual([
      expect.objectContaining({
        orden: 1,
        tipoAlimentoId: null,
        tipoAlimentoNombreSnapshot: null,
        etapaSnapshot: null,
        diaInicio: 1,
        diaFin: 2,
        extendidoHastaDiaObjetivo: false,
        consumoPorAveG: new Prisma.Decimal('20.00'),
        consumoTotalKg: new Prisma.Decimal('0.200'),
      }),
      expect.objectContaining({
        orden: 2,
        tipoAlimentoId: 1,
        diaInicio: 3,
        diaFin: 10,
        consumoPorAveG: new Prisma.Decimal('80.00'),
        consumoTotalKg: new Prisma.Decimal('0.800'),
      }),
    ]);
  });

  it('hueco interior entre dos etapas reales', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [
          filaCatalogo(1, 1, 5),
          filaCatalogo(2, 8, 10, { nombre: 'Engorde', etapa: 'engorde' }),
        ],
      }),
    );

    expect(resultado.estado).toBe('catalogo_incompleto');
    expect(resultado.renglones.map((r) => [r.diaInicio, r.diaFin, r.tipoAlimentoId])).toEqual([
      [1, 5, 1],
      [6, 7, null],
      [8, 10, 2],
    ]);
  });

  it('etapa finita con dia_fin menor a dia_objetivo deja un hueco de cola (no se extiende)', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        catalogo: [filaCatalogo(1, 1, 8)],
      }),
    );

    expect(resultado.estado).toBe('catalogo_incompleto');
    expect(resultado.renglones).toEqual([
      expect.objectContaining({
        orden: 1,
        tipoAlimentoId: 1,
        diaInicio: 1,
        diaFin: 8,
        extendidoHastaDiaObjetivo: false,
      }),
      expect.objectContaining({
        orden: 2,
        tipoAlimentoId: null,
        diaInicio: 9,
        diaFin: 10,
      }),
    ]);
  });
});

describe('construirDesgloseAlimento -- normalizacion de marca', () => {
  it('cruza el lote y el catalogo sin importar mayusculas ni espacios', () => {
    const resultado = construirDesgloseAlimento(
      parametrosBase({
        marcaAlimento: 'Italcol',
        catalogo: [filaCatalogo(1, 1, 10, { marca: '  ITALCOL  ' })],
      }),
    );

    expect(resultado.estado).toBe('calculado');
    expect(resultado.marcaAlimentoSnapshot).toBe('italcol');
  });
});

describe('construirDesgloseAlimento -- redondeo por diferencias acumuladas', () => {
  it('las dos sumas cuadran exacto pese a decimales periodicos', () => {
    const acumuladorTercios = (escala: string) => (dia: number) =>
      new Prisma.Decimal(dia).mul(escala).div(3);

    const resultado = construirDesgloseAlimento(
      parametrosBase({
        diaObjetivoSnapshot: 10,
        consumoPorAveGEsperado: new Prisma.Decimal('333.33'),
        consumoTotalKgEsperado: new Prisma.Decimal('3.333'),
        acumuladoPorAveEnDia: acumuladorTercios('100'),
        acumuladoTotalKgEnDia: acumuladorTercios('1'),
        catalogo: [
          filaCatalogo(1, 1, 4),
          filaCatalogo(2, 5, 10, { etapa: 'iniciacion' }),
        ],
      }),
    );

    expect(resultado.estado).toBe('calculado');
    const sumaPorAve = resultado.renglones.reduce(
      (acc, r) => acc.plus(r.consumoPorAveG),
      new Prisma.Decimal(0),
    );
    const sumaTotalKg = resultado.renglones.reduce(
      (acc, r) => acc.plus(r.consumoTotalKg),
      new Prisma.Decimal(0),
    );
    expect(sumaPorAve.equals(new Prisma.Decimal('333.33'))).toBe(true);
    expect(sumaTotalKg.equals(new Prisma.Decimal('3.333'))).toBe(true);
  });
});

describe('construirDesgloseAlimento -- defensa en profundidad', () => {
  it('lanza si los totales esperados no cuadran con el acumulado real', () => {
    expect(() =>
      construirDesgloseAlimento(
        parametrosBase({
          consumoPorAveGEsperado: new Prisma.Decimal('999.99'),
          catalogo: [filaCatalogo(1, 1, 10)],
        }),
      ),
    ).toThrow(/desglose invalido/);
  });
});
