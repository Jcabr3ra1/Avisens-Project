import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalisisBioacusticoService } from './analisis-bioacustico.service';

describe('AnalisisBioacusticoService', () => {
  let service: AnalisisBioacusticoService;
  const prisma = {
    galpon: { findUnique: jest.fn(), findFirst: jest.fn() },
    lote: { findUnique: jest.fn() },
    modeloMl: { findFirst: jest.fn() },
    analisisBioacustico: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const propietario = { id: 7, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalisisBioacusticoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AnalisisBioacusticoService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('registra un análisis con relaciones consistentes', async () => {
    prisma.galpon.findUnique.mockResolvedValue({
      granja: { propietario_id: 7 },
    });
    prisma.lote.findUnique.mockResolvedValue({ galpon_id: 2 });
    prisma.modeloMl.findFirst.mockResolvedValue({ id: 4 });
    prisma.analisisBioacustico.create.mockResolvedValue({ id: 1 });
    await expect(
      service.crear(
        { galpon_id: 2, lote_id: 3, modelo_id: 4, indicador: 'estres' },
        propietario,
      ),
    ).resolves.toEqual({ id: 1 });
  });

  it('rechaza un lote que pertenece a otro galpón', async () => {
    prisma.galpon.findUnique.mockResolvedValue({
      granja: { propietario_id: 7 },
    });
    prisma.lote.findUnique.mockResolvedValue({ galpon_id: 99 });
    await expect(
      service.crear({ galpon_id: 2, lote_id: 3 }, propietario),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza el galpón de otro propietario', async () => {
    prisma.galpon.findUnique.mockResolvedValue({
      granja: { propietario_id: 99 },
    });
    await expect(service.crear({ galpon_id: 2 }, propietario)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('aplica el alcance del propietario al listado', async () => {
    await service.listar(propietario, { page: 1, limit: 20 });
    const llamadas = prisma.analisisBioacustico.findMany.mock
      .calls as unknown as Array<[{ where: Record<string, unknown> }]>;
    const argumentos = llamadas[0][0];
    expect(argumentos.where).toMatchObject({
      galpon: { granja: { propietario_id: propietario.id } },
    });
  });
});
