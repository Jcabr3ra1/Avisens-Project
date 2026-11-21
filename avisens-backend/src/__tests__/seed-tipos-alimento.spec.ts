import type { PrismaClient } from '@prisma/client';
import { sembrarTiposAlimento } from '../../prisma/seeds/seed-alimentos';

type PrismaFalso = {
  tipoAlimento: { findFirst: jest.Mock; create: jest.Mock };
};

describe('sembrarTiposAlimento', () => {
  const prisma: PrismaFalso = {
    tipoAlimento: { findFirst: jest.fn(), create: jest.fn() },
  };

  const sembrar = () => sembrarTiposAlimento(prisma as unknown as PrismaClient);

  const creadosDeMarca = (marca: 'italcol' | 'estandar') =>
    (
      prisma.tipoAlimento.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )
      .map(([arg]) => arg.data)
      .filter((tipo) => tipo.marca === marca);

  beforeEach(() => jest.clearAllMocks());

  it('siembra el plan de alimentación de Italcol', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(creadosDeMarca('italcol').map((t) => t.nombre)).toEqual([
      'Pollito Preiniciador',
      'Súper Pollito Iniciación',
      'Súper Pollo Engorde Granja',
    ]);
  });

  // Las cantidades salen del manual de Italcol (paso 24). Si alguien las
  // «redondea» sin volver al manual, los indicadores de consumo se van a
  // comparar contra una curva inventada.
  it('respeta los gramos por ave que manda el manual', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(
      creadosDeMarca('italcol').map((t) => t.consumo_total_esperado_g),
    ).toEqual([200, 1000, 2800]);
  });

  // Italcol cambia de alimento por gramos consumidos, no por días: los rangos
  // salen de cruzar esos gramos con la tabla de consumo acumulado.
  it('cubre los 42 días sin huecos ni solapes', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    const tramos = creadosDeMarca('italcol').map((t) => [
      t.dia_inicio,
      t.dia_fin,
    ]);
    expect(tramos).toEqual([
      [1, 8],
      [9, 21],
      [22, 42],
    ]);
  });

  it('usa las mismas etapas que las curvas objetivo', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(creadosDeMarca('italcol').map((t) => t.etapa)).toEqual([
      'preiniciacion',
      'iniciacion',
      'engorde',
    ]);
  });

  it('siembra las cuatro etapas del perfil estándar con sus rangos', async () => {
    prisma.tipoAlimento.findFirst.mockResolvedValue(null);

    await sembrar();

    expect(
      creadosDeMarca('estandar').map((t) => [t.etapa, t.dia_inicio, t.dia_fin]),
    ).toEqual([
      ['preiniciacion', 1, 8],
      ['iniciacion', 9, 21],
      ['engorde', 22, 34],
      ['finalizacion', 35, null],
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
