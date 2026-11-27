import { Prisma, EstadoDesgloseAlimento } from '@prisma/client';
import {
  RenglonDesglose,
  ParametrosValidacionDesglose,
  validarDesgloseAlimento,
} from './desglose-alimento';

function renglonReal(
  orden: number,
  diaInicio: number,
  diaFin: number,
  opts: {
    etapa?: string;
    nombre?: string;
    tipoAlimentoId?: number;
    extendido?: boolean;
    porAve?: string;
    totalKg?: string;
  } = {},
): RenglonDesglose {
  return {
    orden,
    tipoAlimentoId: opts.tipoAlimentoId ?? 1,
    tipoAlimentoNombreSnapshot: opts.nombre ?? 'Preiniciador',
    etapaSnapshot: opts.etapa ?? 'preiniciacion',
    diaInicio,
    diaFin,
    extendidoHastaDiaObjetivo: opts.extendido ?? false,
    consumoPorAveG: new Prisma.Decimal(opts.porAve ?? '10.00'),
    consumoTotalKg: new Prisma.Decimal(opts.totalKg ?? '0.100'),
  };
}

function renglonHueco(
  orden: number,
  diaInicio: number,
  diaFin: number,
  porAve: string,
  totalKg: string,
): RenglonDesglose {
  return {
    orden,
    tipoAlimentoId: null,
    tipoAlimentoNombreSnapshot: null,
    etapaSnapshot: null,
    diaInicio,
    diaFin,
    extendidoHastaDiaObjetivo: false,
    consumoPorAveG: new Prisma.Decimal(porAve),
    consumoTotalKg: new Prisma.Decimal(totalKg),
  };
}

function parametros(
  estado: EstadoDesgloseAlimento | null,
  diaObjetivo: number | null,
  porAve: string | null,
  totalKg: string | null,
): ParametrosValidacionDesglose {
  return {
    estadoDesglose: estado,
    diaObjetivoSnapshot: diaObjetivo,
    consumoPorAveGEsperado: porAve === null ? null : new Prisma.Decimal(porAve),
    consumoTotalKgEsperado: totalKg === null ? null : new Prisma.Decimal(totalKg),
  };
}

const ESTADOS_SIN_RENGLONES: (EstadoDesgloseAlimento | null)[] = [
  null,
  'legado_sin_desglose',
  'lote_sin_marca_alimento',
  'marca_sin_catalogo',
  'catalogo_invalido',
  'catalogo_ambiguo',
];

describe('validarDesgloseAlimento -- estados sin renglones', () => {
  for (const estado of ESTADOS_SIN_RENGLONES) {
    it(`arreglo vacio es valido para estado_desglose = ${estado}`, () => {
      expect(
        validarDesgloseAlimento([], parametros(estado, null, null, null)),
      ).toBe(true);
    });

    it(`un renglon presente es invalido para estado_desglose = ${estado}`, () => {
      const renglones = [renglonReal(1, 1, 10)];
      expect(
        validarDesgloseAlimento(
          renglones,
          parametros(estado, 10, '10.00', '0.100'),
        ),
      ).toBe(false);
    });
  }
});

describe('validarDesgloseAlimento -- guardas antes de iterar', () => {
  const renglones = [renglonReal(1, 1, 10)];

  it('dia_objetivo_snapshot nulo es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', null, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('dia_objetivo_snapshot menor a 1 es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 0, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('consumo_por_ave_g esperado nulo es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, null, '0.100'),
      ),
    ).toBe(false);
  });

  it('consumo_total_kg esperado nulo es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', null),
      ),
    ).toBe(false);
  });

  it('arreglo vacio con estado calculado es invalido', () => {
    expect(
      validarDesgloseAlimento(
        [],
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });
});

describe('validarDesgloseAlimento -- invariantes por renglon', () => {
  it('orden no consecutivo es invalido', () => {
    const renglones = [renglonReal(1, 1, 5), renglonReal(3, 6, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '20.00', '0.200'),
      ),
    ).toBe(false);
  });

  it('orden duplicado es invalido', () => {
    const renglones = [renglonReal(1, 1, 5), renglonReal(1, 6, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '20.00', '0.200'),
      ),
    ).toBe(false);
  });

  it('dia_inicio no entero es invalido', () => {
    const renglones = [renglonReal(1, 1.5, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('dia_inicio menor a 1 es invalido', () => {
    const renglones = [renglonReal(1, 0, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('dia_fin menor a dia_inicio es invalido', () => {
    const renglones = [renglonReal(1, 5, 3)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('consumo_por_ave_g negativo es invalido', () => {
    const renglones = [renglonReal(1, 1, 10, { porAve: '-1.00' })];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '-1.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('consumo_total_kg negativo es invalido', () => {
    const renglones = [renglonReal(1, 1, 10, { totalKg: '-0.100' })];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '-0.100'),
      ),
    ).toBe(false);
  });
});

describe('validarDesgloseAlimento -- coherencia del snapshot', () => {
  it('renglon real con nombre vacio es invalido', () => {
    const renglones = [renglonReal(1, 1, 10, { nombre: '' })];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('renglon real con etapa fuera de ETAPAS_ALIMENTACION es invalido', () => {
    const renglones = [renglonReal(1, 1, 10, { etapa: 'desconocida' })];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('renglon con tipo_alimento_id pero snapshot parcial (nombre nulo) es invalido', () => {
    const renglones: RenglonDesglose[] = [
      {
        orden: 1,
        tipoAlimentoId: 1,
        tipoAlimentoNombreSnapshot: null,
        etapaSnapshot: 'preiniciacion',
        diaInicio: 1,
        diaFin: 10,
        extendidoHastaDiaObjetivo: false,
        consumoPorAveG: new Prisma.Decimal('10.00'),
        consumoTotalKg: new Prisma.Decimal('0.100'),
      },
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('renglon sintetico con extendido_hasta_dia_objetivo es invalido', () => {
    const renglones = [
      {
        ...renglonHueco(1, 1, 10, '10.00', '0.100'),
        extendidoHastaDiaObjetivo: true,
      },
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('catalogo_incompleto', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });
});

describe('validarDesgloseAlimento -- cobertura y ausencia de solapes', () => {
  it('el primer renglon no empieza en el dia 1 es invalido', () => {
    const renglones = [renglonReal(1, 2, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('el ultimo renglon no termina en dia_objetivo_snapshot es invalido', () => {
    const renglones = [renglonReal(1, 1, 9)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '10.00', '0.100'),
      ),
    ).toBe(false);
  });

  it('un hueco entre renglones es invalido', () => {
    const renglones = [renglonReal(1, 1, 5), renglonReal(2, 7, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '20.00', '0.200'),
      ),
    ).toBe(false);
  });

  it('un solape entre renglones es invalido', () => {
    const renglones = [renglonReal(1, 1, 8), renglonReal(2, 6, 10)];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '20.00', '0.200'),
      ),
    ).toBe(false);
  });

  it('renglones contiguos que cubren exacto 1..dia_objetivo son validos', () => {
    const renglones = [
      renglonReal(1, 1, 8, { porAve: '80.00', totalKg: '0.800' }),
      renglonReal(2, 9, 10, {
        etapa: 'iniciacion',
        nombre: 'Iniciador',
        tipoAlimentoId: 2,
        extendido: true,
        porAve: '20.00',
        totalKg: '0.200',
      }),
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.000'),
      ),
    ).toBe(true);
  });
});

describe('validarDesgloseAlimento -- renglones sinteticos por estado', () => {
  it('calculado con un renglon sintetico es invalido', () => {
    const renglones = [
      renglonReal(1, 1, 5, { porAve: '50.00', totalKg: '0.500' }),
      renglonHueco(2, 6, 10, '50.00', '0.500'),
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.000'),
      ),
    ).toBe(false);
  });

  it('catalogo_incompleto sin ningun renglon sintetico es invalido', () => {
    const renglones = [renglonReal(1, 1, 10, { porAve: '100.00', totalKg: '1.000' })];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('catalogo_incompleto', 10, '100.00', '1.000'),
      ),
    ).toBe(false);
  });

  it('catalogo_incompleto con un renglon sintetico es valido', () => {
    const renglones = [
      renglonReal(1, 1, 5, { porAve: '50.00', totalKg: '0.500' }),
      renglonHueco(2, 6, 10, '50.00', '0.500'),
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('catalogo_incompleto', 10, '100.00', '1.000'),
      ),
    ).toBe(true);
  });
});

describe('validarDesgloseAlimento -- extension de la ultima etapa', () => {
  it('dos renglones extendidos a la vez es invalido', () => {
    const renglones = [
      renglonReal(1, 1, 5, { extendido: true, porAve: '50.00', totalKg: '0.500' }),
      renglonReal(2, 6, 10, {
        etapa: 'iniciacion',
        nombre: 'Iniciador',
        tipoAlimentoId: 2,
        extendido: true,
        porAve: '50.00',
        totalKg: '0.500',
      }),
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.000'),
      ),
    ).toBe(false);
  });

  it('un renglon extendido que no es el ultimo es invalido', () => {
    const renglones = [
      renglonReal(1, 1, 5, { extendido: true, porAve: '50.00', totalKg: '0.500' }),
      renglonReal(2, 6, 10, {
        etapa: 'iniciacion',
        nombre: 'Iniciador',
        tipoAlimentoId: 2,
        porAve: '50.00',
        totalKg: '0.500',
      }),
    ];
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.000'),
      ),
    ).toBe(false);
  });
});

describe('validarDesgloseAlimento -- sumas exactas con Prisma.Decimal', () => {
  const renglones = [
    renglonReal(1, 1, 8, { porAve: '80.00', totalKg: '0.800' }),
    renglonReal(2, 9, 10, {
      etapa: 'iniciacion',
      nombre: 'Iniciador',
      tipoAlimentoId: 2,
      extendido: true,
      porAve: '20.00',
      totalKg: '0.200',
    }),
  ];

  it('la suma de consumo_por_ave_g no cuadra con el esperado es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '99.99', '1.000'),
      ),
    ).toBe(false);
  });

  it('la suma de consumo_total_kg no cuadra con el esperado es invalido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.001'),
      ),
    ).toBe(false);
  });

  it('las dos sumas cuadran exacto contra el total de 2A es valido', () => {
    expect(
      validarDesgloseAlimento(
        renglones,
        parametros('calculado', 10, '100.00', '1.000'),
      ),
    ).toBe(true);
  });
});
