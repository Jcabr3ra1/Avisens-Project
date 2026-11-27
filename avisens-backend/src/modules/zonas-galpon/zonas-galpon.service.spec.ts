import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { ZonasGalponService } from './zonas-galpon.service';

describe('ZonasGalponService', () => {
  let service: ZonasGalponService;
  const prisma = {
    galpon: { findUnique: jest.fn(), findFirst: jest.fn() },
    zonaGalpon: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const administrador = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario = { id: 7, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonasGalponService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ZonasGalponService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('crea una zona en un galpón propio', async () => {
    prisma.galpon.findUnique.mockResolvedValue({
      granja: { propietario_id: 7 },
    });
    prisma.zonaGalpon.create.mockResolvedValue({ id: 1 });
    await expect(
      service.crear({ galpon_id: 1, nombre: 'Zona norte' }, propietario),
    ).resolves.toEqual({ id: 1 });
  });

  it('impide crear zonas en galpones de otro propietario', async () => {
    prisma.galpon.findUnique.mockResolvedValue({
      granja: { propietario_id: 99 },
    });
    await expect(
      service.crear({ galpon_id: 1, nombre: 'Zona norte' }, propietario),
    ).rejects.toThrow(ForbiddenException);
  });

  it('limita el listado del propietario a sus galpones', async () => {
    await service.listar(propietario, { page: 1, limit: 20 });
    const llamadas = prisma.zonaGalpon.findMany.mock.calls as unknown as Array<
      [{ where: Record<string, unknown> }]
    >;
    const argumentos = llamadas[0][0];
    expect(argumentos.where).toMatchObject({
      galpon: { granja: { propietario_id: propietario.id } },
    });
  });

  it('lanza NotFound al obtener una zona inexistente', async () => {
    prisma.zonaGalpon.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99, administrador)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('desactiva una zona conservando sus relaciones', async () => {
    prisma.zonaGalpon.findUnique.mockResolvedValue({
      id: 1,
      galpon_id: 2,
      galpon: { granja: { propietario_id: 7 } },
    });
    prisma.zonaGalpon.update.mockResolvedValue({ id: 1, activa: false });
    await expect(service.eliminar(1, propietario)).resolves.toEqual({
      id: 1,
      activa: false,
    });
  });
});
