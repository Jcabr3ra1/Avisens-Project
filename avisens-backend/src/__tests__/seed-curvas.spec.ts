import type { PrismaClient } from '@prisma/client';
import { sembrarCurvasObjetivo } from '../../prisma/seeds/seed-curvas';

type FilaCurva = {
  marca: string;
  fuente?: string;
  origen: string;
  sexo: string;
  dia: number;
  peso_esperado_g: number;
  consumo_diario_g?: number;
  consumo_acumulado_g?: number;
  fcr_objetivo?: number;
  etapa_alimentacion?: string;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
};

describe('sembrarCurvasObjetivo', () => {
  const prisma = {
    curvaObjetivo: {
      upsert: jest.fn(),
    },
  };

  const filasSembradas = (): FilaCurva[] =>
    (
      prisma.curvaObjetivo.upsert.mock.calls as Array<[{ create: FilaCurva }]>
    ).map(([arg]) => arg.create);

  const filasDe = (marca: string, sexo: string): FilaCurva[] =>
    filasSembradas()
      .filter((fila) => fila.marca === marca && fila.sexo === sexo)
      .sort((a, b) => a.dia - b.dia);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.curvaObjetivo.upsert.mockResolvedValue({});
  });

  it.each(['macho', 'hembra', 'mixto'] as const)(
    'Italcol (%s) cubre días 1 al 6 arrancando en 42 g y empatando con 211 g en el día 7',
    async (sexo) => {
      await sembrarCurvasObjetivo(prisma as unknown as PrismaClient);

      const filas = filasDe('italcol', sexo);
      const primeraSemana = filas.filter((f) => f.dia >= 1 && f.dia <= 7);

      expect(primeraSemana.map((f) => f.dia)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(primeraSemana[0].peso_esperado_g).toBe(42);
      expect(primeraSemana[6].peso_esperado_g).toBe(211);

      // El peso esperado y el consumo acumulado deben crecer cada día sin saltos atrás
      for (let i = 1; i < primeraSemana.length; i++) {
        expect(primeraSemana[i].peso_esperado_g).toBeGreaterThan(
          primeraSemana[i - 1].peso_esperado_g,
        );
        expect(primeraSemana[i].consumo_acumulado_g!).toBeGreaterThan(
          primeraSemana[i - 1].consumo_acumulado_g!,
        );
        expect(primeraSemana[i].etapa_alimentacion).toBe('preiniciacion');
      }
    },
  );

  it('Italcol (mixto) también cubre las semanas 2 a 6 (días 14, 21, 28, 35, 42)', async () => {
    await sembrarCurvasObjetivo(prisma as unknown as PrismaClient);

    const dias = filasDe('italcol', 'mixto').map((f) => f.dia);
    expect(dias).toEqual([1, 2, 3, 4, 5, 6, 7, 14, 21, 28, 35, 42]);
  });

  it('Solla (mixto) cubre días 1 al 6 arrancando en 42 g y empatando con 160 g en el día 7', async () => {
    await sembrarCurvasObjetivo(prisma as unknown as PrismaClient);

    const primeraSemana = filasDe('solla', 'mixto').filter(
      (f) => f.dia >= 1 && f.dia <= 7,
    );

    expect(primeraSemana.map((f) => f.dia)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(primeraSemana[0].peso_esperado_g).toBe(42);
    expect(primeraSemana[6].peso_esperado_g).toBe(160);

    for (let i = 1; i < primeraSemana.length; i++) {
      expect(primeraSemana[i].peso_esperado_g).toBeGreaterThan(
        primeraSemana[i - 1].peso_esperado_g,
      );
      expect(primeraSemana[i].etapa_alimentacion).toBe('preiniciacion');
    }
  });

  it('marca todas las filas sembradas con origen seed y usa upsert idempotente', async () => {
    await sembrarCurvasObjetivo(prisma as unknown as PrismaClient);

    const todas = filasSembradas();
    expect(todas.length).toBeGreaterThan(0);
    expect(todas.every((f) => f.origen === 'seed')).toBe(true);
  });
});
