import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecomendacionesService } from './recomendaciones.service';
import { IndicadoresService } from '../indicadores/indicadores.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('RecomendacionesService', () => {
  let service: RecomendacionesService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    recomendacion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const indicadores = {
    compararConCurva: jest.fn(),
    kpisFinancieros: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };

  const loteConDueno = {
    galpon_id: 7,
    galpon: { granja: { propietario_id: 1 } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecomendacionesService,
        { provide: PrismaService, useValue: prisma },
        { provide: IndicadoresService, useValue: indicadores },
      ],
    }).compile();
    service = module.get<RecomendacionesService>(RecomendacionesService);
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.recomendacion.findFirst.mockResolvedValue(null);
    prisma.recomendacion.create.mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 1, ...(args.data as object) }),
    );
    indicadores.compararConCurva.mockResolvedValue({
      veredicto: 'en_objetivo',
    });
    indicadores.kpisFinancieros.mockResolvedValue({ costo_por_kg_cop: null });
  });

  afterEach(() => jest.clearAllMocks());

  it('lanza NotFound cuando el lote no existe', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);
    await expect(service.generar(1, admin)).rejects.toThrow(NotFoundException);
  });

  it('no genera nada cuando el lote va bien y el costo es normal', async () => {
    const r = await service.generar(1, admin);
    expect(r.generadas).toBe(0);
    expect(prisma.recomendacion.create).not.toHaveBeenCalled();
  });

  it('genera recomendacion peso_bajo cuando el lote va por_debajo', async () => {
    indicadores.compararConCurva.mockResolvedValue({
      veredicto: 'por_debajo',
      desvio_peso_pct: -13.04,
      dia_vida: 21,
    });

    const r = await service.generar(1, admin);

    expect(r.generadas).toBe(1);
    const calls = prisma.recomendacion.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({
      lote_id: 1,
      galpon_id: 7,
      tipo: 'peso_bajo',
      prioridad: 'alta',
    });
  });

  it('genera recomendacion costo_alto cuando el costo por kg supera el umbral', async () => {
    indicadores.kpisFinancieros.mockResolvedValue({ costo_por_kg_cop: 5030 });

    const r = await service.generar(1, admin);

    expect(r.generadas).toBe(1);
    const calls = prisma.recomendacion.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({
      tipo: 'costo_alto',
      prioridad: 'media',
    });
  });

  it('no duplica si ya existe una recomendacion pendiente del mismo tipo', async () => {
    indicadores.compararConCurva.mockResolvedValue({
      veredicto: 'por_debajo',
      desvio_peso_pct: -13,
      dia_vida: 21,
    });
    prisma.recomendacion.findFirst.mockResolvedValue({ id: 99 });

    const r = await service.generar(1, admin);

    expect(r.generadas).toBe(0);
    expect(prisma.recomendacion.create).not.toHaveBeenCalled();
  });

  it('resolver marca la recomendacion como resuelta', async () => {
    prisma.recomendacion.findUnique.mockResolvedValue({
      id: 1,
      lote: { galpon: { granja: { propietario_id: 1 } } },
    });
    prisma.recomendacion.update.mockResolvedValue({
      id: 1,
      estado: 'resuelta',
    });

    await service.resolver(1, admin);

    const calls = prisma.recomendacion.update.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({ estado: 'resuelta' });
  });
});
