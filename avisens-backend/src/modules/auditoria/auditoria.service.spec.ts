import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService, filtroAuditoria } from './auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  const prisma = {
    bitacoraAuditoria: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    usuario: { findMany: jest.fn() },
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

  describe('filtros', () => {
    it('aplica el mismo filtro al listado y al conteo', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listar({
        page: 1,
        limit: 20,
        accion: 'eliminar',
        usuario_id: 3,
      });

      const where = { accion: 'eliminar', usuario_id: 3 };
      expect(prisma.bitacoraAuditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(prisma.bitacoraAuditoria.count).toHaveBeenCalledWith({ where });
    });

    it('sin filtros no restringe nada', () => {
      expect(filtroAuditoria({ page: 1, limit: 20 })).toEqual({});
    });

    it('el rango de fechas incluye el día completo en hora de Colombia', () => {
      const where = filtroAuditoria({
        page: 1,
        limit: 20,
        desde: '2026-10-01',
        hasta: '2026-10-17',
        entidad: 'usuarios',
      });
      expect(where.entidad_afectada).toBe('usuarios');
      expect(where.fecha_hora).toEqual({
        gte: new Date('2026-10-01T05:00:00.000Z'),
        lte: new Date('2026-10-18T04:59:59.999Z'),
      });
    });

    it('acepta solo un extremo del rango', () => {
      expect(
        filtroAuditoria({ page: 1, limit: 20, hasta: '2026-10-17' }).fecha_hora,
      ).toEqual({
        lte: new Date('2026-10-18T04:59:59.999Z'),
      });
    });
  });

  describe('opciones', () => {
    it('devuelve las acciones, entidades y usuarios presentes en la bitácora', async () => {
      prisma.bitacoraAuditoria.groupBy
        .mockResolvedValueOnce([{ accion: 'crear' }, { accion: 'login' }])
        .mockResolvedValueOnce([{ entidad_afectada: 'auth' }]);
      prisma.usuario.findMany.mockResolvedValue([
        { id: 1, nombre_completo: 'Ana' },
      ]);

      await expect(service.opciones()).resolves.toEqual({
        acciones: ['crear', 'login'],
        entidades: ['auth'],
        usuarios: [{ id: 1, nombre_completo: 'Ana' }],
      });
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
