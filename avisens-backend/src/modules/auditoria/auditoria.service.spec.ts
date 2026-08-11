import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  const prisma = {
    bitacoraAuditoria: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<AuditoriaService>(AuditoriaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listar', () => {
    it('devuelve paginado y ordena por fecha_hora descendente', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 1 }], 1]);

      const res = await service.listar({ page: 1, limit: 10 });

      expect(res.meta.total).toBe(1);
      const args = (
        prisma.bitacoraAuditoria.findMany.mock.calls[0] as [
          { orderBy: Record<string, string> },
        ]
      )[0];
      expect(args.orderBy).toEqual({ fecha_hora: 'desc' });
    });
  });

  describe('registrar', () => {
    it('no lanza si el insert falla (la auditoria es resiliente)', async () => {
      prisma.bitacoraAuditoria.create.mockRejectedValue(new Error('db caida'));

      await expect(
        service.registrar({ accion: 'crear', entidad_afectada: 'lotes' }),
      ).resolves.toBeUndefined();
    });
  });
});
