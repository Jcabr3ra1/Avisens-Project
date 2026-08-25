import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizacionesService } from './organizaciones.service';

describe('OrganizacionesService', () => {
  let service: OrganizacionesService;

  const prisma = {
    organizacion: { findMany: jest.fn(), count: jest.fn() },
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
});
