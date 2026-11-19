import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CompararLotesService } from './comparar-lotes.service';

describe('CompararLotesService', () => {
  let service: CompararLotesService;

  const prisma = {
    lote: { findMany: jest.fn() },
    pesaje: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
    indicadorLote: { findMany: jest.fn() },
  };

  const propietario = { id: 5, rol: 'Propietario' };
  const admin = { id: 1, rol: 'Administrador' };

  const lote1Base = {
    id: 1,
    codigo: 'LOT-2026-000001',
    estado: 'finalizado',
    fecha_ingreso: new Date('2026-06-01T00:00:00.000Z'),
    fecha_salida_real: new Date('2026-06-03T00:00:00.000Z'),
    cantidad_inicial: 1000,
    cantidad_aves_vendidas: 980,
    peso_promedio_final_g: 2100,
    mortalidad_acumulada_final_pct: 2,
    fcr_final: 1.55,
    galpon: {
      id: 3,
      nombre: 'Galpón 1',
      granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
    },
  };

  const lote2Base = {
    id: 2,
    codigo: 'LOT-2026-000002',
    estado: 'finalizado',
    fecha_ingreso: new Date('2026-08-01T00:00:00.000Z'),
    fecha_salida_real: new Date('2026-08-04T00:00:00.000Z'),
    cantidad_inicial: 2000,
    cantidad_aves_vendidas: 1900,
    peso_promedio_final_g: 2300,
    mortalidad_acumulada_final_pct: 5,
    fcr_final: 1.62,
    galpon: {
      id: 4,
      nombre: 'Galpón 2',
      granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompararLotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CompararLotesService);

    prisma.lote.findMany.mockResolvedValue([lote1Base, lote2Base]);
    prisma.pesaje.findMany.mockResolvedValue([]);
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
    prisma.consumoDiario.findMany.mockResolvedValue([]);
    prisma.indicadorLote.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('rechaza (400) si se pasa el mismo lote dos veces', async () => {
    await expect(service.comparar(1, 1, propietario)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.lote.findMany).not.toHaveBeenCalled();
  });

  it('rechaza (404) si alguno de los dos lotes no existe', async () => {
    prisma.lote.findMany.mockResolvedValue([lote1Base]);

    await expect(service.comparar(1, 99, propietario)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza (403) si el propietario intenta comparar un lote ajeno', async () => {
    prisma.lote.findMany.mockResolvedValue([
      lote1Base,
      {
        ...lote2Base,
        galpon: {
          ...lote2Base.galpon,
          granja: { id: 9, nombre: 'Ajena', propietario_id: 999 },
        },
      },
    ]);

    await expect(service.comparar(1, 2, propietario)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('organiza ambos lotes día por día superpuestos desde el día 1 hasta el más largo', async () => {
    prisma.pesaje.findMany.mockResolvedValue([
      {
        lote_id: 1,
        fecha: new Date('2026-06-01T00:00:00.000Z'),
        peso_promedio_g: 42,
      },
      {
        lote_id: 1,
        fecha: new Date('2026-06-02T00:00:00.000Z'),
        peso_promedio_g: 100,
      },
      {
        lote_id: 1,
        fecha: new Date('2026-06-02T00:00:00.000Z'),
        peso_promedio_g: 120,
      },
      {
        lote_id: 2,
        fecha: new Date('2026-08-01T00:00:00.000Z'),
        peso_promedio_g: 45,
      },
      {
        lote_id: 2,
        fecha: new Date('2026-08-03T00:00:00.000Z'),
        peso_promedio_g: 150,
      },
    ]);
    prisma.registroMortalidad.findMany.mockResolvedValue([
      {
        lote_id: 1,
        fecha: new Date('2026-06-02T00:00:00.000Z'),
        cantidad_aves: 10,
      },
      {
        lote_id: 1,
        fecha: new Date('2026-06-03T00:00:00.000Z'),
        cantidad_aves: 10,
      },
      {
        lote_id: 2,
        fecha: new Date('2026-08-02T00:00:00.000Z'),
        cantidad_aves: 40,
      },
    ]);
    prisma.consumoDiario.findMany.mockResolvedValue([
      {
        lote_id: 1,
        fecha: new Date('2026-06-01T00:00:00.000Z'),
        alimento_kg: 20,
      },
      {
        lote_id: 1,
        fecha: new Date('2026-06-02T00:00:00.000Z'),
        alimento_kg: 30,
      },
      {
        lote_id: 2,
        fecha: new Date('2026-08-01T00:00:00.000Z'),
        alimento_kg: 50,
      },
    ]);

    const res = await service.comparar(1, 2, propietario);

    expect(res.lote_1.id).toBe(1);
    expect(res.lote_1.duracion_dias).toBe(3);
    expect(res.lote_2.id).toBe(2);
    expect(res.lote_2.duracion_dias).toBe(4);
    expect(res.dias_totales).toBe(4);
    expect(res.serie).toHaveLength(4);
    expect(res.serie.map((p) => p.dia)).toEqual([1, 2, 3, 4]);

    // Día 1
    expect(res.serie[0].lote_1).toMatchObject({
      fecha: '2026-06-01',
      peso_promedio_g: 42,
      mortalidad_dia_aves: 0,
      mortalidad_acumulada_pct: 0,
      alimento_dia_kg: 20,
      alimento_acumulado_kg: 20,
    });
    expect(res.serie[0].lote_2).toMatchObject({
      fecha: '2026-08-01',
      peso_promedio_g: 45,
      alimento_dia_kg: 50,
    });

    // Día 2: promedio de 100 y 120 = 110 g en lote 1
    expect(res.serie[1].lote_1).toMatchObject({
      peso_promedio_g: 110,
      mortalidad_dia_aves: 10,
      mortalidad_acumulada_aves: 10,
      mortalidad_acumulada_pct: 1,
      alimento_acumulado_kg: 50,
    });

    // Día 3: lote 1 usa peso_promedio_final_g (2100) y fcr_final (1.55) al no tener pesaje
    expect(res.serie[2].lote_1).toMatchObject({
      peso_promedio_g: 2100,
      mortalidad_acumulada_aves: 20,
      mortalidad_acumulada_pct: 2,
      fcr: 1.55,
    });

    // Día 4: lote 1 ya había cerrado (null), lote 2 sigue hasta día 4
    expect(res.serie[3].lote_1).toBeNull();
    expect(res.serie[3].lote_2).toMatchObject({
      fecha: '2026-08-04',
      peso_promedio_g: 2300,
      fcr: 1.62,
    });
  });

  it('permite al administrador comparar lotes de cualquier granja', async () => {
    prisma.lote.findMany.mockResolvedValue([
      lote1Base,
      {
        ...lote2Base,
        galpon: {
          ...lote2Base.galpon,
          granja: { id: 9, nombre: 'Otra', propietario_id: 999 },
        },
      },
    ]);

    const res = await service.comparar(1, 2, admin);

    expect(res.lote_1.id).toBe(1);
    expect(res.lote_2.id).toBe(2);
  });
});
