import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UmbralesService } from './umbrales.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UmbralesService', () => {
  let service: UmbralesService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    umbralAmbiental: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 1,
    variable: 'temperatura',
    semana_vida: 1,
    valor_minimo: 30,
    valor_maximo: 33,
    unidad: '°C',
    criticidad: 'alta',
  };

  const umbralVigente = {
    id: 10,
    galpon_id: 1,
    variable: 'temperatura',
    semana_vida: 1,
    valor_minimo: 30,
    valor_maximo: 33,
    unidad: '°C',
    criticidad: 'alta',
    version: 1,
    vigente: true,
    galpon: { id: 1, nombre: 'G1', granja: { id: 1, propietario_id: 5 } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UmbralesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UmbralesService>(UmbralesService);

    prisma.galpon.findUnique.mockResolvedValue({
      id: 1,
      granja: { propietario_id: 5 },
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('rechaza (409) si ya existe un umbral vigente para galpón+variable+semana', async () => {
      prisma.umbralAmbiental.findFirst.mockResolvedValue({ id: 10 });

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.umbralAmbiental.create).not.toHaveBeenCalled();
    });

    it('crea la versión 1 si no hay uno vigente', async () => {
      prisma.umbralAmbiental.findFirst.mockResolvedValue(null);
      prisma.umbralAmbiental.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, admin);
      expect(prisma.umbralAmbiental.create).toHaveBeenCalled();
    });

    it('un Propietario de otra granja recibe 403', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revisar', () => {
    it('jubila el vigente y crea la versión siguiente en una transacción', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue(umbralVigente);

      prisma.$transaction.mockImplementation(
        (cb: (tx: typeof prisma) => unknown) => cb(prisma),
      );
      prisma.umbralAmbiental.update.mockResolvedValue({});
      prisma.umbralAmbiental.create.mockResolvedValue({ id: 11 });

      await service.revisar(10, { valor_maximo: 35 }, admin);

      expect(prisma.umbralAmbiental.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { vigente: false },
        }),
      );

      const calls = prisma.umbralAmbiental.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(calls[0][0].data).toMatchObject({
        version: 2,
        vigente: true,
        valor_maximo: 35,
        valor_minimo: 30,
      });
    });

    it('rechaza (400) si el umbral ya no está vigente', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue({
        ...umbralVigente,
        vigente: false,
      });

      await expect(
        service.revisar(10, { valor_maximo: 35 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
