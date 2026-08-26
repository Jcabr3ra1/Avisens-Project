import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Solicitante } from '../../common/auth/acceso';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { ComandosVozService } from './comandos-voz.service';

describe('ComandosVozService', () => {
  let service: ComandosVozService;

  const prisma = {
    comandoVoz: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    galpon: { findUnique: jest.fn(), findFirst: jest.fn() },
    medicion: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };
  const operario: Solicitante = {
    id: 8,
    rol: ROLES.OPERARIO,
    organizacion_id: 2,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComandosVozService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ComandosVozService);
    prisma.comandoVoz.findUnique.mockResolvedValue(null);
    prisma.comandoVoz.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 1, ...data }),
    );
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
      granja: { propietario_id: 5 },
    });
    prisma.galpon.findFirst.mockResolvedValue({ id: 3 });
    prisma.medicion.findMany.mockResolvedValue([
      {
        valor: 25.4,
        calidad: 'ok',
        sensor: { tipo: 'temperatura', unidad_medida: 'C' },
      },
    ]);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('ejecuta únicamente una consulta ambiental permitida', async () => {
    const resultado = await service.interpretar(
      { galpon_id: 3, comando_texto: '¿Cuál es la temperatura?' },
      propietario,
    );

    expect(resultado).toMatchObject({
      tipo_comando: 'consultar_temperatura',
      accion_ejecutada: 'consulta_ambiental',
      requiere_clarificacion: false,
      lecturas: [{ valor: 25.4 }],
    });
    expect(prisma.medicion.findMany).toHaveBeenCalled();
  });

  it('no ejecuta órdenes que cambian equipos o datos', async () => {
    const resultado = await service.interpretar(
      { galpon_id: 3, comando_texto: 'Apaga los ventiladores' },
      propietario,
    );

    expect(resultado).toMatchObject({
      tipo_comando: 'accion_no_autorizada',
      requiere_clarificacion: true,
    });
    expect(prisma.medicion.findMany).not.toHaveBeenCalled();
  });

  it('deduplica una sincronización offline por usuario y UUID', async () => {
    prisma.comandoVoz.findUnique.mockResolvedValue({
      id: 10,
      usuario_id: 5,
      id_sincronizacion: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
    });

    const resultado = await service.interpretar(
      {
        galpon_id: 3,
        comando_texto: 'temperatura',
        id_sincronizacion: 'ad65a582-4ef3-48c9-b847-2f9f6a8c6186',
        modo_conexion: 'offline',
      },
      propietario,
    );

    expect(resultado.duplicado).toBe(true);
    expect(prisma.comandoVoz.create).not.toHaveBeenCalled();
    expect(prisma.medicion.findMany).not.toHaveBeenCalled();
  });

  it('deduplica también dos sincronizaciones concurrentes', async () => {
    const idSincronizacion = 'c44c896d-b78c-4380-ad53-18040921ad06';
    prisma.comandoVoz.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 11,
        usuario_id: 5,
        id_sincronizacion: idSincronizacion,
      });
    prisma.comandoVoz.create.mockRejectedValue(
      Object.assign(new Error('duplicado'), { code: 'P2002' }),
    );

    const resultado = await service.interpretar(
      {
        galpon_id: 3,
        comando_texto: 'temperatura',
        id_sincronizacion: idSincronizacion,
        modo_conexion: 'offline',
      },
      propietario,
    );

    expect(resultado).toMatchObject({ id: 11, duplicado: true });
    expect(prisma.comandoVoz.findUnique).toHaveBeenCalledTimes(2);
  });

  it('respeta el alcance de galpón del operario', async () => {
    prisma.galpon.findFirst.mockResolvedValue(null);

    await expect(
      service.interpretar({ galpon_id: 3, comando_texto: 'humedad' }, operario),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.comandoVoz.create).not.toHaveBeenCalled();
  });

  it('sincroniza lotes offline marcando el modo de conexión', async () => {
    const resultado = await service.sincronizar(
      {
        comandos: [
          {
            galpon_id: 3,
            comando_texto: 'temperatura',
            id_sincronizacion: '185cf512-9917-41bd-b5c9-bb23c6bf4e57',
          },
          {
            galpon_id: 3,
            comando_texto: 'humedad',
            id_sincronizacion: '64f5a98f-f002-48fb-ac71-ced12b49226f',
          },
        ],
      },
      propietario,
    );

    expect(resultado.procesados).toBe(2);
    const llamadas = prisma.comandoVoz.create.mock.calls as Array<
      [{ data: { modo_conexion: string } }]
    >;
    expect(
      llamadas.every(([args]) => args.data.modo_conexion === 'offline'),
    ).toBe(true);
  });

  it('rechaza lotes offline que no se pueden deduplicar', async () => {
    await expect(
      service.sincronizar(
        {
          comandos: [{ galpon_id: 3, comando_texto: 'temperatura' }],
        },
        propietario,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.comandoVoz.create).not.toHaveBeenCalled();
  });

  it('rechaza un comando offline individual sin UUID', async () => {
    await expect(
      service.interpretar(
        {
          galpon_id: 3,
          comando_texto: 'temperatura',
          modo_conexion: 'offline',
        },
        propietario,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.galpon.findUnique).not.toHaveBeenCalled();
  });

  it('el historial solo consulta comandos del usuario autenticado', async () => {
    await service.historial(operario, { page: 1, limit: 20 });

    expect(prisma.comandoVoz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: 8 } }),
    );
  });
});
