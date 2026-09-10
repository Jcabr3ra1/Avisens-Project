import type { PrismaClient } from '@prisma/client';
import { sembrarTiposAlimento } from '../../prisma/seeds/seed-alimentos';

type PrismaFalso = {
  tipoAlimento: { findFirst: jest.Mock; create: jest.Mock };
};

describe('sembrarTiposAlimento', () => {
  const prisma: PrismaFalso = {
    tipoAlimento: { findFirst: jest.fn(), create: jest.fn() },
  };

  const sembrar = () =>
    sembrarTiposAlimento(prisma as unknown as PrismaClient);

  const creados = () =>
    (
      prisma.tipoAlimento.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    ).map(([arg]) => arg.data);

  beforeEach(() => jest.clearAllMocks());

  it('siembra el catálogo inicial de Italcol y Solla', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(creados().map((t) => t.nombre)).toEqual([
      'Pollito Preiniciador',
      'Súper Pollito Iniciación',
      'Súper Pollo Engorde Granja',
      'Nutrepollo',
      'Broiler I',
    ]);
  });

  // Las cantidades salen del manual de Italcol (paso 24). Si alguien las
  // «redondea» sin volver al manual, los indicadores de consumo se van a
  // comparar contra una curva inventada.
  it('respeta los gramos por ave que manda el manual', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    const italcol = creados().filter((t) => t.marca === 'italcol');

    expect(italcol.map((t) => t.consumo_total_esperado_g)).toEqual([
      200, 1000, 2800,
    ]);
  });

  // Italcol cambia de alimento por gramos consumidos, no por días: los rangos
  // salen de cruzar esos gramos con la tabla de consumo acumulado.
  it('cubre los 42 días sin huecos ni solapes', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    const tramos = creados()
      .filter((t) => t.marca === 'italcol')
      .map((t) => [t.dia_inicio, t.dia_fin]);
    expect(tramos).toEqual([
      [1, 8],
      [9, 21],
      [22, 42],
    ]);
  });

  it('usa las mismas etapas que las curvas objetivo', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(
      creados()
        .filter((t) => t.marca === 'italcol')
        .map((t) => t.etapa),
    ).toEqual([
      'preiniciacion',
      'iniciacion',
      'engorde',
    ]);
  });

  it('siembra las referencias Solla verificadas sin inventar consumo esperado', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    const solla = creados()
      .filter((t) => t.marca === 'solla')
      .map((t) => ({
        nombre: t.nombre,
        dia_inicio: t.dia_inicio,
        dia_fin: t.dia_fin,
        consumo_total_esperado_g: t.consumo_total_esperado_g,
      }));

    expect(solla).toEqual([
      {
        nombre: 'Nutrepollo',
        dia_inicio: 1,
        dia_fin: 25,
        consumo_total_esperado_g: undefined,
      },
      {
        nombre: 'Broiler I',
        dia_inicio: 26,
        dia_fin: undefined,
        consumo_total_esperado_g: undefined,
      },
    ]);
  });

  // El seed corre en cada despliegue con RUN_SEED: no puede duplicar el
  // catálogo cada vez.
  it('no duplica lo que ya está sembrado', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue({ id: 1 });

    await sembrar();

    expect(prisma.tipoAlimento.create).not.toHaveBeenCalled();
  });
});
