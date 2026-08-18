import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrediccionesService } from './predicciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

describe('PrediccionesService', () => {
  let service: PrediccionesService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findMany: jest.fn() },
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const loteConDueno = {
    fecha_ingreso: new Date('2026-07-01'),
    galpon: { granja: { propietario_id: 5 } },
  };

  const tresPesajes = [
    { fecha: new Date('2026-07-08'), peso_promedio_g: 180 },
    { fecha: new Date('2026-07-15'), peso_promedio_g: 500 },
    { fecha: new Date('2026-07-22'), peso_promedio_g: 1000 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PrediccionesService>(PrediccionesService);
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lanza NotFound cuando el lote no existe', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);
    await expect(service.predecir(1, admin)).rejects.toThrow(NotFoundException);
  });

  it('lanza Forbidden cuando el lote es de otro propietario', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      fecha_ingreso: new Date('2026-07-01'),
      galpon: { granja: { propietario_id: 999 } },
    });
    await expect(service.predecir(1, propietario)).rejects.toThrow(
      /propios lotes/,
    );
  });

  it('lanza BadRequest cuando hay menos de 3 pesajes', async () => {
    prisma.pesaje.findMany.mockResolvedValue(tresPesajes.slice(0, 2));
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequest cuando el servicio ML responde con error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(service.predecir(1, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('devuelve la prediccion del servicio ML con los dias calculados', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        peso_proyectado_faena_g: 3256,
        dia_faena: 42,
        dias_al_objetivo: 37,
        peso_objetivo_g: 2500,
      }),
    });
    global.fetch = fetchMock;

    const r = await service.predecir(1, admin);

    expect(r).toMatchObject({
      lote_id: 1,
      pesajes_usados: 3,
      peso_proyectado_faena_g: 3256,
      dias_al_objetivo: 37,
    });

    const calls = fetchMock.mock.calls as Array<[string, { body: string }]>;
    const body = JSON.parse(calls[0][1].body) as {
      pesajes: Array<{ dia: number; peso: number }>;
    };
    expect(body.pesajes).toEqual([
      { dia: 7, peso: 180 },
      { dia: 14, peso: 500 },
      { dia: 21, peso: 1000 },
    ]);
  });
});
