import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizacionesService } from './organizaciones.service';

describe('OrganizacionesService', () => {
  let service: OrganizacionesService;

  const prisma = {
    organizacion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    sesion: { updateMany: jest.fn() },
    usuarioGalpon: { updateMany: jest.fn() },
    usuario: { updateMany: jest.fn() },
    granja: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrganizacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('lista organizaciones paginadas y ordenadas por nombre', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 1, nombre: 'Avícola' }], 1]);

    const resultado = await service.listar({ page: 2, limit: 5 });

    expect(prisma.organizacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { nombre: 'asc' },
        skip: 5,
        take: 5,
      }),
    );
    expect(resultado.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
  });

  it('crea una organización normalizando nombre y NIT', async () => {
    prisma.organizacion.create.mockResolvedValue({ id: 1 });

    await service.crear({ nombre: '  Avícola  ', nit: ' 900-1 ' });

    expect(prisma.organizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nombre: 'Avícola', nit: '900-1', plan: undefined },
      }),
    );
  });

  it('desactiva el tenant y revoca todos sus accesos', async () => {
    prisma.organizacion.findUnique.mockResolvedValue({ id: 4 });
    prisma.$transaction.mockResolvedValue([]);

    await expect(service.desactivar(4)).resolves.toEqual({
      id: 4,
      activa: false,
    });
    expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
      where: { usuario: { organizacion_id: 4 }, revocada: false },
      data: { revocada: true },
    });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { organizacion_id: 4, activo: true },
      data: { activo: false },
    });
    expect(prisma.granja.updateMany).toHaveBeenCalledWith({
      where: { organizacion_id: 4, activa: true },
      data: { activa: false },
    });
  });
});
